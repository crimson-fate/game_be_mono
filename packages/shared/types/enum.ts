import { TransactionReceipt } from 'ethers';

// Transaction Type for SNS
export enum TransactionType {
  Other = 'Other',
}

export enum BlockWorkerStatus {
  PENDING = 0,
  SUCCESS = 1,
  FAILED = 2,
}

export enum TransactionWorkerStatus {
  PENDING = 0,
  SUCCESS = 1,
}

export type TransactionWorkerType = {
  txHash: string;
  status: TransactionWorkerStatus;
};

export enum EventType {
  Register = 'register',
  Transfer = 'transferOwnership',
  DiscountRegister = 'discountedRegister',
  Renew = 'renew',
  TextChanged = 'textChanged',
  IPAssetRegistered = 'ipAssetRegistered',
}

export type LogsReturnValues = {
  txReceipt: TransactionReceipt;
  returnValues: any;
  eventType: EventType;
  index?: number;
};
