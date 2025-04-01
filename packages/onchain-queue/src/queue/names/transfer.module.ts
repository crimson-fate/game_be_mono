import { BullModule } from '@nestjs/bull';
import { MongooseModule } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';
import { DetectionService } from '../detection.service';
import { Web3Service } from '@app/web3/web3.service';
import { Chain, ChainSchema } from '@app/shared/models/chain.schema';
import { Name, NameSchema } from '@app/shared/models/names.schema';
import { MQ_JOB_DEFAULT_CONFIG, QUEUE_METADATA } from '@app/shared/types/queue';
import { ONCHAIN_QUEUES } from '@app/shared/constants';
import { TransferNameProcessor } from './processor/transfer.processor';
import {
  EthNameRecord,
  EthNameRecordSchema,
} from '@app/shared/models/records.schema';
import { Metadata, MetadataSchema } from '@app/shared/models/metadata.schema';
import { IpaMetadata, IpaMetadataSchema } from '@app/shared/models/ip-metadata';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Chain.name,
        schema: ChainSchema,
      },
      {
        name: Name.name,
        schema: NameSchema,
      },
      {
        name: EthNameRecord.name,
        schema: EthNameRecordSchema,
      },
      {
        name: Metadata.name,
        schema: MetadataSchema,
      },
      {
        name: IpaMetadata.name,
        schema: IpaMetadataSchema,
      },
    ]),
    BullModule.registerQueue(
      {
        name: QUEUE_METADATA,
        defaultJobOptions: MQ_JOB_DEFAULT_CONFIG,
      },
      {
        name: ONCHAIN_QUEUES.QUEUE_TRANSFER_NAME,
        defaultJobOptions: MQ_JOB_DEFAULT_CONFIG,
      },
    ),
  ],
  providers: [DetectionService, Web3Service, TransferNameProcessor],
})
export class TransferNameModule {}
