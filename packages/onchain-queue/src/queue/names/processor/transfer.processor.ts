import { InjectModel } from '@nestjs/mongoose';
import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';
import configuration from '@app/shared/configuration';
import { ONCHAIN_JOBS, ONCHAIN_QUEUES } from '@app/shared/constants';
import { retryUntil } from '@app/shared/utils/promise';
import { LogsReturnValues } from '@app/shared/types';
import { DetectionService } from '../../detection.service';
import { Chain, ChainDocument } from '@app/shared/models/chain.schema';
import { Model } from 'mongoose';
export type TransferNameWorkerDTO = {
  oldOwner: string;
  newOwner: string;
  tokenId: string;
};

@Processor(ONCHAIN_QUEUES.QUEUE_TRANSFER_NAME)
export class TransferNameProcessor {
  constructor(
    private readonly detectionService: DetectionService,
    @InjectModel(Chain.name) private readonly chainModel: Model<ChainDocument>,
    @InjectQueue(ONCHAIN_QUEUES.QUEUE_TRANSFER_NAME)
    private readonly queue: Queue<LogsReturnValues>,
  ) {}

  logger = new Logger(TransferNameProcessor.name);
  @Process({ name: ONCHAIN_JOBS.JOB_TRANSFER_NAME, concurrency: 100 })
  async processTransferName(job: Job<LogsReturnValues>) {
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
        `Failed to detect tx hash - TransferName ${event.txReceipt.hash}`,
      );
      this.queue.add(ONCHAIN_JOBS.JOB_TRANSFER_NAME, event);
    }
  }
}
