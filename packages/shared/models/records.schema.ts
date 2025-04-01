import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { BaseSchema } from './base.schema';

export type EthNameRecordDocument = EthNameRecord & Document;

class Addresses {
  @Prop({ required: true, unique: true })
  '60': string;
}

class TextData {
  @Prop()
  avatar: string;

  @Prop()
  email: string;

  @Prop()
  description: string;

  @Prop()
  url: string;

  @Prop({ unique: true })
  warpcast: string;

  @Prop({ unique: true })
  twitter: string;

  @Prop({ unique: true })
  telegram: string;

  @Prop({ unique: true })
  discord: string;

  @Prop()
  keywords: string;

  @Prop()
  logo: string;

  @Prop()
  banner: string;
}

class Data {
  @Prop({ type: Addresses })
  addresses: Addresses;

  @Prop({ type: TextData })
  text: TextData;
}

@Schema({ timestamps: true })
export class EthNameRecord extends BaseSchema {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ unique: true, sparse: true })
  ethName: string;

  @Prop({ type: Data, required: true })
  data: Data;
}

export const EthNameRecordSchema = SchemaFactory.createForClass(EthNameRecord);
