import { BullModule } from '@nestjs/bull';
import { MongooseModule } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';
import { Chain, ChainSchema } from '@app/shared/models/chain.schema';
import { Blocks, BlockSchema } from '@app/shared/models/block.schema';
import { Name, NameSchema } from '@app/shared/models/names.schema';
import { MQ_JOB_DEFAULT_CONFIG, ONCHAIN_QUEUES } from '@app/shared/constants';
import { BlockDetectionController } from './block-detection.controller';
import { Web3Service } from '@app/web3/web3.service';
import { OnchainQueueService } from '@app/shared/modules/queue/onchainQueue.service';
import { QUEUE_METADATA } from '@app/shared/types/queue';
import {
  EthNameRecord,
  EthNameRecordSchema,
} from '@app/shared/models/records.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Chain.name, schema: ChainSchema },
      { name: Blocks.name, schema: BlockSchema },
      {
        name: Name.name,
        schema: NameSchema,
      },
      {
        name: EthNameRecord.name,
        schema: EthNameRecordSchema,
      },
    ]),
    BullModule.registerQueue(
      {
        name: QUEUE_METADATA,
        defaultJobOptions: MQ_JOB_DEFAULT_CONFIG,
      },
      {
        name: ONCHAIN_QUEUES.QUEUE_REGISTER_NAME,
        defaultJobOptions: MQ_JOB_DEFAULT_CONFIG,
      },
      {
        name: ONCHAIN_QUEUES.QUEUE_RENEW_NAME,
        defaultJobOptions: MQ_JOB_DEFAULT_CONFIG,
      },
      {
        name: ONCHAIN_QUEUES.QUEUE_TRANSFER_NAME,
        defaultJobOptions: MQ_JOB_DEFAULT_CONFIG,
      },
      {
        name: ONCHAIN_QUEUES.QUEUE_TEXT_CHANGED,
        defaultJobOptions: MQ_JOB_DEFAULT_CONFIG,
      },
      {
        name: ONCHAIN_QUEUES.QUEUE_UPDATE_IPASSET_METADATA,
        defaultJobOptions: MQ_JOB_DEFAULT_CONFIG,
      },
    ),
  ],
  controllers: [BlockDetectionController],
  providers: [Web3Service, OnchainQueueService],
})
export class BlockDetectionModule {}
