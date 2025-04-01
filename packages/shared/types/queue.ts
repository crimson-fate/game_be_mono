export const QUEUE_METADATA = 'metadata';

export const ONCHAIN_QUEUES = {
  QUEUE_REGISTER_NAME: 'QUEUE_REGISTER_NAME',
  QUEUE_TRANFER_NAME: 'QUEUE_TRANFER_NAME',
};

export const JOB_QUEUE_NFT_METADATA = 'fetch_metadata';

export const ONCHAIN_JOB = {
  JOB_REGISTER_NAME: 'JOB_REGISTER_NAME',
  JOB_TRANSFER_NAME: 'JOB_TRANSFER_NAME',
};

export const MQ_JOB_DEFAULT_CONFIG = {
  removeOnComplete: true,
  removeOnFail: {
    count: 1000, // keep up to 1000 jobs
  },
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 1000,
  },
};
