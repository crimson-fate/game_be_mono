// SPDX-License-Identifier: MIT

import { BlockWorkerStatus, TransactionWorkerType } from '@app/shared/types';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BlockDocument = Blocks & Document;

@Schema()
export class Blocks {
  @Prop({ index: true })
  blockNumber: number;

  @Prop({ index: true })
  chain: string;

  @Prop()
  transactions: TransactionWorkerType[];

  @Prop()
  status: BlockWorkerStatus;

  @Prop()
  timestamp: number;
}

export const BlockSchema = SchemaFactory.createForClass(Blocks);
