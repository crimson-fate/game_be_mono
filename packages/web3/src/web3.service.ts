/* eslint-disable @typescript-eslint/no-unused-vars */
import { InjectModel } from '@nestjs/mongoose';
import { Chain, ChainDocument } from '@app/shared/models/chain.schema';
import { EventType, LogsReturnValues } from '@app/shared/types';
import { CONTRACT_ADDRESS } from '@app/shared/utils/constants';
import { Injectable } from '@nestjs/common';
import { Contract, JsonRpcProvider, TransactionReceipt } from 'ethers';
import { Model } from 'mongoose';
import { Name, NameDocument } from '@app/shared/models/names.schema';
import { ethers } from 'ethers';
import { labelhash, namehash } from 'viem';
import { ABIS, EventSignatures } from 'web3/abi';
import configuration from '@app/shared/configuration';
@Injectable()
export class Web3Service {
  constructor(
    @InjectModel(Chain.name)
    private readonly chainModel: Model<ChainDocument>,
    @InjectModel(Name.name)
    private readonly nameModel: Model<NameDocument>,
  ) {}

  getProvider(rpc: string) {
    const provider = new JsonRpcProvider(rpc);
    return provider;
  }
  async getBlockTime(rpc?: string) {
    if (!rpc) {
      const chain = await this.chainModel.findOne();
      rpc = chain.rpcUrl;
    }
    const provider = this.getProvider(rpc);
    const block = await provider.getBlock('pending');

    return block.timestamp * 1e3;
  }

  getContractInstance(
    abi: any,
    contractAddress: string,
    rpc: string,
  ): Contract {
    const provider = this.getProvider(rpc);
    const contractInstance = new Contract(abi, contractAddress, provider);
    return contractInstance;
  }

  async getReturnValuesEvent(
    txReceipt: TransactionReceipt,
    chain: ChainDocument,
    timestamp: number,
  ): Promise<LogsReturnValues[]> {
    const eventWithTypes = await Promise.all(
      txReceipt.logs.map(async (log) => {
        if (log.topics[0] === EventSignatures.NameRegistered) {
          const valueDecode = await this.decodeNameRegistered(
            log,
            txReceipt.logs,
          );
          if (valueDecode) {
            return {
              txReceipt,
              returnValues: { ...valueDecode },
              eventType: EventType.Register,
            };
          }
        } else if (
          log.topics[0] === EventSignatures.Transfer &&
          log.address === CONTRACT_ADDRESS.StoryRegistrarAddress
        ) {
          const valueDecode = await this.decodeTransferEventsLog(log);
          if (valueDecode) {
            return {
              txReceipt,
              returnValues: { ...valueDecode },
              eventType: EventType.Transfer,
            };
          }
        } else if (
          log.topics[0] === EventSignatures.TextChanged &&
          log.address === CONTRACT_ADDRESS.StoryResolver
        ) {
          const valueDecode = await this.decodedTextChanged(log);
          if (valueDecode) {
            return {
              txReceipt,
              returnValues: { ...valueDecode },
              eventType: EventType.TextChanged,
            };
          }
        } else if (log.topics[0] === EventSignatures.NameRenewed) {
          const valueDecode = await this.decodeRenewEventsLog(log);
          if (valueDecode) {
            return {
              txReceipt,
              returnValues: { ...valueDecode },
              eventType: EventType.Renew,
            };
          }
        } else if (log.topics[0] === EventSignatures.IPRegistered) {
          const valueDecode = await this.decodeIPAssetRegistered(log, chain);
          if (valueDecode) {
            return {
              txReceipt,
              returnValues: { ...valueDecode },
              eventType: EventType.IPAssetRegistered,
            };
          }
        }

        return null;
      }),
    );

    const filteredEvents = eventWithTypes.filter((event) => event !== null);
    return filteredEvents;
  }

  async decodeNameRegistered(log, allLogs) {
    const iface = new ethers.Interface(ABIS.NameRegistered);

    try {
      const owner = ethers.getAddress(log.topics[2].slice(-40));
      const decodedData = iface.decodeEventLog('NameRegistered', log.data);
      const tokenId = labelhash(decodedData.name);
      const ipNameHash = namehash(`${decodedData.name}.ip`);
      const isPrimary = await this.checkReverseClaimed(owner, allLogs);

      const decodeValue = {
        tokenId: tokenId,
        name: `${decodedData.name}.ip`,
        nameHash: ipNameHash,
        label: decodedData.name,
        chain: 'Odyssey',
        owner: owner,
        metadataUrl: `${configuration().SERVER_URL}/metadata/${tokenId}`,
        type: 'ONCHAIN',
        expiresAt: decodedData[3].toString() * 1000,
        isPrimaryName: isPrimary,
      };

      return decodeValue;
    } catch (error) {
      console.error('Error decoding NameRegistered event:', error.message);
    }
  }

  async checkReverseClaimed(owner, allLogs) {
    return allLogs.some((log) => {
      return (
        log.topics[0] === EventSignatures.ReverseClaimed &&
        ethers.getAddress(log.topics[1].slice(-40)) === owner
      );
    });
  }

  async decodeTransferEventsLog(log) {
    const from = ethers.getAddress(log.topics[1].slice(-40));
    const to = ethers.getAddress(log.topics[2].slice(-40));
    const id = log.topics[3];

    try {
      if (from === '0x0000000000000000000000000000000000000000') {
        return;
      }

      const decodeValue = {
        oldOwner: from,
        newOwner: to,
        tokenId: id,
      };
      return decodeValue;
    } catch (error) {
      console.error('Error decoding TransferSingle event:', error.message);
    }
  }

  //Decode the metadata  profile
  async decodedTextChanged(log) {
    try {
      const iface = new ethers.Interface(ABIS.TextChanged);
      const decodedData = iface.decodeEventLog('TextChanged', log.data);

      const valudeDecode = {
        nameHash: log.topics[1],
        key: decodedData.key,
        value: decodedData.value,
      };
      return valudeDecode;
    } catch (error) {
      console.error('Error decoding UpdateMetaData event:', error.message);
    }
  }

  //Renew the name
  async decodeRenewEventsLog(log) {
    try {
      const iface = new ethers.Interface(ABIS.NameRenewed);
      const decodedData = iface.decodeEventLog('NameRenewed', log.data);
      const valueDecode = {
        tokenId: log.topics[1],
        expiresAt: decodedData.expires.toString() * 1000,
      };
      return valueDecode;
    } catch (error) {
      console.error('Error decoding NameRenewed event:', error.message);
    }
  }

  async getPrimaryNameLog(log) {
    try {
      const valueName = {
        owner: ethers.getAddress(log.topics[1].slice(-40)),
        nameHash: log.topics[2],
      };
      return valueName;
    } catch (error) {
      console.error('Error decoding BaseReverseClaimed event:', error.message);
    }
  }

  async decodeIPAssetRegistered(log, chain) {
    try {
      const provider = await this.getProvider(chain.rpcUrl);
      const txMayBeIpAssets = await provider.getTransaction(
        log.transactionHash,
      );
      if (txMayBeIpAssets.data.startsWith('0x02bd3091')) {
        const funcIface = new ethers.Interface(
          ABIS.MintAndRegisterIpAndAttachPILTerms,
        );

        const eventIface = new ethers.Interface(ABIS.IPRegistered);

        const decodedTx = funcIface.parseTransaction({
          data: txMayBeIpAssets.data,
        });
        const spgNftContract = decodedTx.args[0].toLowerCase();
        if (
          spgNftContract !== CONTRACT_ADDRESS.IPA_LOGO.toLocaleLowerCase() &&
          spgNftContract !== CONTRACT_ADDRESS.IPA_BANNER.toLocaleLowerCase()
        ) {
          return;
        }
        const decodeTxdata = {
          spgNftContract: decodedTx.args[0],
          recipient: decodedTx.args[1],
          ipMetadata: {
            uri: decodedTx.args[2][0],
            metadataHash: decodedTx.args[2][1],
            uri2: decodedTx.args[2][2],
            metadataHash2: decodedTx.args[2][3],
          },
        };
        const decodedLog = eventIface.decodeEventLog('IPRegistered', log.data);
        const chainId = parseInt(log.topics[1], 16);
        const tokenContract = ethers.getAddress(log.topics[2].slice(-40)); // Get tokenContract
        const tokenId = parseInt(log.topics[3], 16);

        const decodeValue = {
          ipId: decodedLog.ipId,
          chainId: chainId,
          tokenContract: tokenContract,
          tokenId: tokenId,
          name: decodedLog.name,
          uri: decodedLog.uri,
          registrationDate: Number(decodedLog.registrationDate) * 1000,
          ...decodeTxdata,
        };
        return decodeValue;
      }
      return null;
    } catch (error) {
      console.error('Error decoding IPRegistered event:', error.message);
    }
  }
}
