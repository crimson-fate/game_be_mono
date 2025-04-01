// SPDX-License-Identifier: MIT

import { Model } from 'mongoose';

import { Queue } from 'bull';
import * as _ from 'lodash';
import configuration from '@app/shared/configuration';

import { ethers } from 'ethers';
import { OnchainWorker } from '../onchainWorker';
import {
  BlockWorkerStatus,
  EventType,
  LogsReturnValues,
  TransactionWorkerStatus,
  TransactionWorkerType,
} from '@app/shared/types';
import { OnchainQueueService } from '@app/shared/modules/queue/onchainQueue.service';
import { BlockDocument } from '@app/shared/models/block.schema';
import { Web3Service } from '@app/web3/web3.service';
import { ChainDocument } from '@app/shared/models/chain.schema';
import { arraySliceProcess } from '@app/shared/utils/arrayLimitProccess';
import { retryUntil } from '@app/shared/utils/promise';
import { ONCHAIN_JOBS } from '@app/shared/constants';

export class BlockDetectionService extends OnchainWorker {
  constructor(
    registerNameQueue: Queue<LogsReturnValues>,
    renewNameQueue: Queue<LogsReturnValues>,
    transferNameQueue: Queue<LogsReturnValues>,
    textChangedQueue: Queue<LogsReturnValues>,
    onchainQueue: OnchainQueueService,
    ipAssetRegisteredQueue: Queue<LogsReturnValues>,
    blockModel: Model<BlockDocument>,
    web3Service: Web3Service,
    chain: ChainDocument,
  ) {
    super(1000, 10, `${BlockDetectionService.name}:${chain.name}`);
    this.logger.log('Created Detection');

    this.web3Service = web3Service;
    this.registerNameQueue = registerNameQueue;
    this.renewNameQueue = renewNameQueue;
    this.transferNameQueue = transferNameQueue;
    this.textChangedQueue = textChangedQueue;
    this.ipAssetRegisteredQueue = ipAssetRegisteredQueue;

    this.onchainQueue = onchainQueue;
    this.chain = chain;
    this.chainId = chain._id;
    this.blockModel = blockModel;
    this.provider = new ethers.JsonRpcProvider(this.chain.rpcUrl);
  }
  chainId: string;
  web3Service: Web3Service;
  onchainQueue: OnchainQueueService;

  provider: ethers.JsonRpcProvider;
  chain: ChainDocument;
  blockModel: Model<BlockDocument>;

  registerNameQueue: Queue<LogsReturnValues>;
  renewNameQueue: Queue<LogsReturnValues>;
  transferNameQueue: Queue<LogsReturnValues>;
  textChangedQueue: Queue<LogsReturnValues>;
  ipAssetRegisteredQueue: Queue<LogsReturnValues>;

  fetchLatestBlock: () => Promise<number> = async () => {
    const latestBlock = await this.provider.getBlock('latest');
    return latestBlock.number - 0;
  };

  init = async () => {
    const latestBlock = await this.blockModel
      .findOne({
        status: BlockWorkerStatus.SUCCESS,
      })
      .sort({ blockNumber: -1 });
    this.currentBlock =
      (latestBlock?.blockNumber || configuration().BLOCK.BEGIN - 1) + 1;

    this.logger.log(`chain: ${JSON.stringify(this.chain)}`);
  };

  fillBlockDataBuffer = async (
    blocks: (number | 'pending')[],
  ): Promise<{ [k: number]: ethers.Block }> => {
    const dataBlocks = await Promise.all(
      blocks.map(async (b) => this.provider.getBlock(b)),
    );

    const groupByBlock: { [k: number]: ethers.Block } = dataBlocks.reduce(
      (acc, cur) => {
        acc[cur.number] = cur;
        return acc;
      },
      {},
    );

    return groupByBlock;
  };

  process = async (block: ethers.Block): Promise<void> => {
    const beginTime = Date.now();
    const blockNumber = block.number;

    this.logger.debug(
      `begin process block ${blockNumber} ${block.transactions.length} txs`,
    );
    let transactionWorker: TransactionWorkerType[] = block.transactions.map(
      (txHash) => {
        return { txHash, status: TransactionWorkerStatus.PENDING };
      },
    );

    let blockEntity = await this.blockModel.findOne({
      blockNumber,
      chain: this.chainId,
    });

    if (!blockEntity) {
      // Insert to db
      blockEntity = await this.blockModel.findOneAndUpdate(
        {
          blockNumber,
          chain: this.chainId,
        },
        {
          $setOnInsert: {
            blockNumber,
            chain: this.chainId,
            transactions: transactionWorker,
            status: BlockWorkerStatus.PENDING,
            timestamp: block.timestamp * 1000,
          },
        },
        {
          upsert: true,
          new: true,
        },
      );
    } else {
      transactionWorker = _.unionBy(
        blockEntity.transactions,
        transactionWorker,
        'txHash',
      );
    }

    const batchProcess = 300;
    const maxRetry = 10;

    await arraySliceProcess(
      transactionWorker,
      async (txs) => {
        await Promise.all(
          txs.map(async (tx) => {
            await retryUntil(
              async () => this.processTx(tx, block.timestamp),
              () => true,
              maxRetry,
            );
          }),
        );
      },
      batchProcess,
    );

    blockEntity.status = BlockWorkerStatus.SUCCESS;
    blockEntity.transactions = transactionWorker;
    await this.blockModel.findOneAndUpdate(
      { blockNumber: blockEntity.blockNumber },
      { $set: blockEntity },
      { upsert: true },
    );

    this.logger.debug(
      `end process block ${blockNumber} ${block.transactions.length} txs in ${
        Date.now() - beginTime
      }ms`,
    );
  };

  async processTx(tx: TransactionWorkerType, timestamp: number) {
    try {
      const { status, txHash } = tx;
      if (status == TransactionWorkerStatus.SUCCESS) {
        return tx;
      }

      const trasactionReceipt =
        await this.provider.getTransactionReceipt(txHash);

      if (!trasactionReceipt) {
        // throw new Error(`Can not get transaction receipt ${txHash}`);
        return undefined;
      }

      //parse event
      const eventWithType = await this.web3Service.getReturnValuesEvent(
        trasactionReceipt,
        this.chain,
        timestamp,
      );

      let index = 0;
      for (const event of eventWithType) {
        event.index = index;
        let queue: Queue<LogsReturnValues> = null;
        let jobName: string = null;
        switch (event.eventType) {
          case EventType.Register:
            queue = this.registerNameQueue;
            jobName = ONCHAIN_JOBS.JOB_REGISTER_NAME;
            break;
          case EventType.Renew:
            queue = this.renewNameQueue;
            jobName = ONCHAIN_JOBS.JOB_RENEW_NAME;
            break;
          case EventType.Transfer:
            queue = this.transferNameQueue;
            jobName = ONCHAIN_JOBS.JOB_TRANSFER_NAME;
            break;
          case EventType.TextChanged:
            queue = this.textChangedQueue;
            jobName = ONCHAIN_JOBS.JOB_TEXT_CHANGED;
            break;
          case EventType.IPAssetRegistered:
            queue = this.ipAssetRegisteredQueue;
            jobName = ONCHAIN_JOBS.JOB_UPDATE_IPASSET_METADATA;
            break;
        }

        if (queue && jobName) {
          await this.onchainQueue.add(queue, jobName, event);
        }
        index++;
      }

      tx.status = TransactionWorkerStatus.SUCCESS;
      return tx;
    } catch (error) {
      throw new Error(
        `get error when detect tx - ${tx.txHash} - error: ${error}`,
      );
    }
  }
}
