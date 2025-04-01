/* eslint-disable @typescript-eslint/no-unused-vars */
import { InjectModel } from '@nestjs/mongoose';
import { Chain, ChainDocument } from '@app/shared/models/chain.schema';

import { EventType, LogsReturnValues } from '@app/shared/types';

import { Web3Service } from '@app/web3/web3.service';

import { Injectable, Logger } from '@nestjs/common';

import { Model } from 'mongoose';
import { Name, NameDocument } from '@app/shared/models/names.schema';

import { NameDto } from '@app/shared/dtos/name.dto';
import { RenewNameWorkerDTO } from './names/processor/renew.processor';
import { TransferNameWorkerDTO } from './names/processor/transfer.processor';
import { TextChangedWorkerDTO } from './names/processor/textChanged.processor';
import {
  EthNameRecord,
  EthNameRecordDocument,
} from '@app/shared/models/records.schema';
import { Metadata, MetaDataDocument } from '@app/shared/models/metadata.schema';
import {
  IpaMetadata,
  IpaMetadataDocument,
  IpaStatus,
} from '@app/shared/models/ip-metadata';
import { CONTRACT_ADDRESS } from '@app/shared/utils/constants';
@Injectable()
export class DetectionService {
  constructor(
    @InjectModel(Chain.name)
    private readonly chainModel: Model<ChainDocument>,
    @InjectModel(Name.name)
    private readonly nameModel: Model<NameDocument>,
    @InjectModel(EthNameRecord.name)
    private readonly ethNameRecordModel: Model<EthNameRecordDocument>,
    @InjectModel(Metadata.name)
    private readonly metadataModel: Model<MetaDataDocument>,

    @InjectModel(IpaMetadata.name)
    private readonly ipaMetadataModel: Model<IpaMetadataDocument>,

    private readonly web3Service: Web3Service,
  ) {}
  logger = new Logger(DetectionService.name);

  async processEvent(
    log: LogsReturnValues,
    chain: ChainDocument,
    index: number,
  ) {
    const process: any = {};

    process[EventType.Register] = this.processRegisterName;
    process[EventType.Renew] = this.proccessRenewName;
    process[EventType.Transfer] = this.processTransferName;
    process[EventType.TextChanged] = this.processUpdateTextChanged;
    process[EventType.IPAssetRegistered] = this.processIPAssetRegistered;
    await process[log.eventType].call(this, log, chain, index);
  }
  async processRegisterName(
    log: LogsReturnValues,
    chain: ChainDocument,
    index: number,
  ) {
    try {
      await this.getOrCreateName(log.returnValues);
    } catch (error) {
      console.log('Error Register Name', error);
    }
  }
  async proccessRenewName(
    log: LogsReturnValues,
    chain: ChainDocument,
    index: number,
  ) {
    try {
      await this.updateRenewName(log.returnValues);
      return true;
    } catch (error) {
      console.log('Error Renew Name - ProcessTx', error);
    }
  }

  async processTransferName(
    log: LogsReturnValues,
    chain: ChainDocument,
    index: number,
  ) {
    try {
      // console.log('Transfer Name', log.returnValues);
      await this.updateOwnerName(log.returnValues);
      return true;
    } catch (error) {
      console.log('Error Transfer Name - ProcessTx', error);
    }
  }
  async processUpdateTextChanged(
    log: LogsReturnValues,
    chain: ChainDocument,
    index: number,
  ) {
    try {
      await this.updateTextChanged(log.returnValues);
    } catch (error) {
      console.log('Error Text Changed - ProcessTx', error);
    }
  }

  async processIPAssetRegistered(
    log: LogsReturnValues,
    chain: ChainDocument,
    index: number,
  ) {

    const uri = log.returnValues.ipMetadata.uri;
    const id = uri.split('/').pop();

    const ipMetaData: IpaMetadata = {
      tokenId: log.returnValues.tokenId,
      title: log.returnValues.name,
      description: `This is a ${log.returnValues.name} IP Asset`,
      ipType:
        CONTRACT_ADDRESS.IPA_LOGO.toLocaleLowerCase() ==
        log.returnValues.spgNftContract.toLowerCase()
          ? 'logo'
          : 'banner',
      contractAddress: log.returnValues.tokenContract,
      relationships: [],
      creators: [],
      media: [],
      attributes: [],
      tags: [],
      status: IpaStatus.Onchain,
      ipId: log.returnValues.ipId,
    };
    await this.getOrCreateIPAMetaData(ipMetaData, id);
  }

  async getOrCreateName(value: NameDto) {
    // console.log('New Value Name', value);
    try {
      const nameExist = await this.nameModel.findOne({
        namehash: value.nameHash,
        chain: value.chain,
      });
      if (nameExist) {
        const ethNameRecord: EthNameRecord = {
          name: value.name,
          data: {
            addresses: {
              60: '',
            },
            text: {
              avatar: '',
              email: '',
              description: '',
              url: '',
              warpcast: '',
              twitter: '',
              telegram: '',
              discord: '',
              keywords: '',
              logo: '',
              banner: '',
            },
          },
          createdAt: new Date().getTime().toString(),
          ethName: value.nameHash,
        };
        await this.getOrCreateEthNameRecord(ethNameRecord);

        const metaData: Metadata = {
          tokenId: value.tokenId,
          name: value.name,
          description: 'Onchain Metadata',
          image: value.metadataUrl,
          external_url: value.metadataUrl,
        };
        await this.getOrCreateMetaData(metaData);
        return nameExist;
      }
      const nameDocument: Name = {
        tokenId: value.tokenId,
        name: value.name,
        nameHash: value.nameHash,
        chain: value.chain,
        owner: value.owner,
        expiresAt: value.expiresAt,
        createdAt: new Date().getTime().toString(),
        label: value.label,
        metadataUrl: value.metadataUrl,
        type: value.type,
        isPrimaryName: false,
      };

      const newName = await this.nameModel.create(nameDocument);
      newName.save();

      const ethNameRecord: EthNameRecord = {
        name: value.name,
        data: {
          addresses: {
            60: '',
          },
          text: {
            avatar: '',
            email: '',
            description: '',
            url: '',
            warpcast: '',
            twitter: '',
            telegram: '',
            discord: '',
            keywords: '',
            logo: '',
            banner: '',
          },
        },
        createdAt: new Date().getTime().toString(),
        ethName: value.nameHash,
      };
      await this.getOrCreateEthNameRecord(ethNameRecord);

      const metaData: Metadata = {
        tokenId: value.tokenId,
        name: value.name,
        description:
          'A personalized Storynames (.ip) domain highlighting creativity and identity within the Story Protocol ecosystem.',
        image: `https://beta-api.storyname.space/metadata/image/${value.name}/namecard.svg`,
        external_url: `https://storyname.space/names/${value.name}`,
      };
      await this.getOrCreateMetaData(metaData);

      return true;
    } catch (error) {
      console.log('Error Get or Create Name', error);
    }
  }

  async updateRenewName(value: RenewNameWorkerDTO) {
    // console.log('Update Name', value);
    try {
      await this.nameModel.findOneAndUpdate(
        {
          tokenId: value.tokenId,
        },
        {
          expiresAt: value.expiresAt,
          updatedAt: new Date().getTime().toString(),
        },
        { new: true, upsert: true },
      );
    } catch (error) {
      console.log('Error Update Renew Name', error);
    }
  }

  async updateOwnerName(value: TransferNameWorkerDTO) {
    // console.log('Update Owner Name', value);
    try {
      await this.nameModel.findOneAndUpdate(
        {
          tokenId: value.tokenId,
          owner: value.oldOwner,
        },
        {
          owner: value.newOwner,
          updatedAt: new Date().getTime().toString(),
        },
        { new: true, upsert: true },
      );
    } catch (error) {
      console.log('Error Update Owner Name', error);
    }
  }

  async updateTextChanged(value: TextChangedWorkerDTO) {
    // console.log('Update Text Changed', value);
    try {
      const allowedKeys = [
        'avatar',
        'banner',
        'email',
        'description',
        'url',
        'warpcast',
        'twitter',
        'telegram',
        'discord',
        'keywords',
      ];
      if (!allowedKeys.includes(value.key)) {
        throw new Error(`Invalid key: ${value.key}`);
      }

      const result = await this.ethNameRecordModel.findOneAndUpdate(
        { ethName: value.nameHash },
        {
          $set: { [`data.text.${value.key}`]: value.value },
          updatedAt: new Date().getTime().toString(),
        },
        { new: true, upsert: true },
      );
      if (value.key === 'avatar') {
        await this.nameModel
          .findOneAndUpdate(
            {
              nameHash: value.nameHash,
            },
            {
              logoUrl: value.value,
            },
          )
          .exec();
      }
      if (value.key === 'banner') {
        await this.nameModel
          .findOneAndUpdate(
            {
              nameHash: value.nameHash,
            },
            {
              bannerUrl: value.value,
            },
          )
          .exec();
      }
    } catch (error) {
      console.log('Error Update Text Changed', error);
    }
  }

  async getOrCreateEthNameRecord(value: EthNameRecord) {
    try {
      const ethNameRecordExist = await this.ethNameRecordModel.findOne({
        name: value.name,
      });
      if (ethNameRecordExist) {
        return ethNameRecordExist;
      }
      const newEthNameRecord = await this.ethNameRecordModel.create(value);
      newEthNameRecord.save();

      return newEthNameRecord;
    } catch (error) {
      console.log('Error Get or Create Eth Name Record', error);
    }
  }

  async getOrCreateMetaData(value: Metadata) {
    try {
      const metaDataExist = await this.metadataModel.findOne({
        tokenId: value.tokenId,
        name:value.name

      });
      if (metaDataExist) {
        return metaDataExist;
      }
      const newMetaData = await this.metadataModel.create(value);
      newMetaData.save();
      return newMetaData;
    } catch (error) {
      console.log('Error Get or Create Meta Data', error);
    }
  }

  ///TODO What important when create metadata for IP
  async getOrCreateIPAMetaData(value: IpaMetadata, id: string) {
    try {
      const ipaMetaDataExist = await this.ipaMetadataModel
        .findById({
          _id: id,
        })
        .exec();
      if (ipaMetaDataExist) {
        const updateData = await this.ipaMetadataModel
          .findByIdAndUpdate(
            {
              _id: id,
            },
            {
              $set: {
                tokenId: value.tokenId,
                status: IpaStatus.Onchain,
                ipId: value.ipId,
              },
            },
            {
              new: true,
              upsert: true,
            },
          )
          .exec();
        return updateData;
      }
      const newIpaMetaData = await this.ipaMetadataModel.create(value);
      newIpaMetaData.save();
      return newIpaMetaData;
    } catch (error) {
      console.log('Error Get or Create IP Metadata', error);
    }
  }
}
