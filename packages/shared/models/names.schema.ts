import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { BaseSchema } from './base.schema';

export type NameDocument = Name & Document;

@Schema({ timestamps: true })
export class Name extends BaseSchema {
  @Prop({ required: true, unique: true })
  tokenId: string;

  @Prop({ required: true, unique: true })
  name: string;

  @Prop()
  nameHash: string;

  @Prop({ required: true })
  label: string;

  @Prop()
  labelHash?: string;

  @Prop({ required: true })
  chain: string;

  @Prop({ required: true })
  owner: string;

  @Prop({ required: true })
  metadataUrl: string;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true, default: false })
  isPrimaryName: boolean;

  @Prop({ required: true })
  expiresAt: number;

  @Prop()
  logoUrl?: string;
  @Prop()
  bannerUrl?: string;
}

export const NameSchema = SchemaFactory.createForClass(Name);
