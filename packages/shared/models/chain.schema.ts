import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { BaseSchema } from './base.schema';

export type ChainDocument = Chain & Document;

@Schema({ timestamps: true })
export class Chain extends BaseSchema {
  @Prop({ required: true, unique: true })
  chainId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  symbol: string;

  @Prop({ required: true })
  rpcUrl: string;

  @Prop({ required: true })
  explorerUrl: string;
}

export const ChainSchema = SchemaFactory.createForClass(Chain);
