import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from './base.schema';
export type MetaDataDocument = Metadata & Document;
@Schema({ timestamps: true })
export class Metadata extends BaseSchema {
  @Prop({ required: false })
  tokenId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  image: string;

  @Prop({ required: true })
  external_url: string;
}

export const MetadataSchema = SchemaFactory.createForClass(Metadata);
