import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ONCHAIN_JOBS, ONCHAIN_QUEUES } from '@app/shared/constants';
import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { DetectionService } from '../../detection.service';
import { Job, Queue } from 'bull';
import { LogsReturnValues } from '@app/shared/types';
import { Chain, ChainDocument } from '@app/shared/models/chain.schema';
import { Model } from 'mongoose';
import { retryUntil } from '@app/shared/utils/promise';
import configuration from '@app/shared/configuration';
@Processor(ONCHAIN_QUEUES.QUEUE_UPDATE_IPASSET_METADATA)
export class UpdateMetaIPProcessor {
  constructor(
    private readonly detectionService: DetectionService,
    @InjectModel(Chain.name) private readonly chainModel: Model<ChainDocument>,
    @InjectQueue(ONCHAIN_QUEUES.QUEUE_UPDATE_IPASSET_METADATA)
    private readonly queue: Queue<LogsReturnValues>,
  ) {}

  logger = new Logger(UpdateMetaIPProcessor.name);
  @Process({ name: ONCHAIN_JOBS.JOB_UPDATE_IPASSET_METADATA, concurrency: 100 })
  async processUpdateMetaIP(job: Job<LogsReturnValues>) {
    const event = job.data;
    const chain = await this.chainModel.findOne();
    try {
      await retryUntil(
        async () =>
          await this.detectionService.processEvent(event, chain, event.index),
        () => true,
        configuration().MAX_RETRY,
      );
    } catch (error) {
      this.logger.error(
        `Failed to detect tx hash Update - update Metadata ${event.txReceipt.hash}`,
      );
      this.queue.add(ONCHAIN_JOBS.JOB_UPDATE_IPASSET_METADATA, event);
    }
  }
}
