import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { BaseSchema } from './base.schema';

export type IpaMetadataDocument = IpaMetadata & Document;

class IpCreatorSocial {
  @Prop({ required: true })
  platform: string;

  @Prop({ required: true })
  url: string;
}

class IpCreator {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  address: string;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: false })
  image?: string;

  @Prop({ type: [IpCreatorSocial], default: [] })
  socialMedia?: IpCreatorSocial[];

  @Prop({ required: false })
  role?: string;

  @Prop({ required: true })
  contributionPercent: number; // Should total 100 for all creators
}

class IpAttribute {
  @Prop({ required: true })
  key: string;

  @Prop({ required: true })
  value: string;
}

class IpRelationship {
  @Prop({ required: true })
  type: string; // E.g., APPEARS_IN, TRAINED_ON, etc.

  @Prop({ required: false })
  target?: string; // Optional field to store the related IP's ID or metadata
}

class IpMedia {
  @Prop({ required: true })
  type: string; // E.g., "image", "video", etc.

  @Prop({ required: true })
  url: string;

  @Prop({ required: false })
  description?: string;
}

export enum IpaStatus {
  Offchain = 'Offchain',
  Onchain = 'Onchain',
}

@Schema({ timestamps: true })
export class IpaMetadata extends BaseSchema {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  ipType: string; // Type of the IP Asset (e.g., "logo", "banner")

  @Prop({ required: true })
  contractAddress: string;

  @Prop({ required: false })
  tokenId?: string;

  @Prop({ required: true, enum: IpaStatus, default: IpaStatus.Offchain })
  status: IpaStatus;

  @Prop({ type: [IpRelationship], default: [] })
  relationships: IpRelationship[]; // Relationships with other IPAs

  @Prop({ required: false })
  watermarkImage?: string; // Optional watermark image

  @Prop({ type: [IpCreator], default: [] })
  creators: IpCreator[]; // Information about the creators

  @Prop({ type: [IpMedia], default: [] })
  media: IpMedia[]; // Supporting media for the IP

  @Prop({ type: [IpAttribute], default: [] })
  attributes: IpAttribute[]; // Arbitrary key-value mappings

  @Prop({ required: false, default: null })
  appInfo?: string; // Application-specific metadata (e.g., Story Protocol app info)

  @Prop({ type: [String], default: [] })
  tags: string[]; // Tags to help surface the IP

  @Prop({ type: Object, default: {} })
  robotTerms?: Record<string, unknown>; // Do Not Train or similar metadata

  @Prop()
  assetImage?: string;

  @Prop({ required: false, default: '' })
  ipId?: string;
}

export const IpaMetadataSchema = SchemaFactory.createForClass(IpaMetadata);
