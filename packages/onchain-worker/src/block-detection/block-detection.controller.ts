import { Controller } from '@nestjs/common';
import { BlockDetectionService } from './block-detection.service';
import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'mongoose';

import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Chain, ChainDocument } from '@app/shared/models/chain.schema';
import { BlockDocument, Blocks } from '@app/shared/models/block.schema';
import { ONCHAIN_QUEUES } from '@app/shared/constants';
import { LogsReturnValues } from '@app/shared/types';
import { OnchainQueueService } from '@app/shared/modules/queue/onchainQueue.service';
import { Web3Service } from '@app/web3/web3.service';

@Controller('block-detection')
export class BlockDetectionController {
  constructor(
    @InjectQueue(ONCHAIN_QUEUES.QUEUE_REGISTER_NAME)
    private readonly registerNameQueue: Queue<LogsReturnValues>,
    @InjectQueue(ONCHAIN_QUEUES.QUEUE_RENEW_NAME)
    private readonly renewNameQueue: Queue<LogsReturnValues>,
    @InjectQueue(ONCHAIN_QUEUES.QUEUE_TRANSFER_NAME)
    private readonly transferNameQueue: Queue<LogsReturnValues>,
    @InjectQueue(ONCHAIN_QUEUES.QUEUE_TEXT_CHANGED)
    private readonly textChangedQueue: Queue<LogsReturnValues>,
    @InjectQueue(ONCHAIN_QUEUES.QUEUE_UPDATE_IPASSET_METADATA)
    private readonly updateIpAssetMetadataQueue: Queue<LogsReturnValues>,

    @InjectModel(Chain.name)
    private readonly chainModel: Model<ChainDocument>,
    @InjectModel(Blocks.name)
    private readonly blockModel: Model<BlockDocument>,
    private readonly onchainQueueService: OnchainQueueService,
    private readonly web3Service: Web3Service,
  ) {
    if (!this.listeners) this.init();
  }
  listeners: BlockDetectionService[];

  async init() {
    const chains = await this.chainModel.find();
    this.listeners = chains
      .filter((chain) => chain._id)
      .map(
        (chain) =>
          new BlockDetectionService(
            this.registerNameQueue,
            this.renewNameQueue,
            this.transferNameQueue,
            this.textChangedQueue,
            this.onchainQueueService,
            this.updateIpAssetMetadataQueue,
            this.blockModel,
            this.web3Service,
            chain,
          ),
      );

    for (const job of this.listeners) {
      job.start();
    }
  }
}
