import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class ZoneConfig {
  @Prop({ required: true })
  zoneId: number;

  @Prop({ required: true })
  zoneLength: number;

  @Prop({ required: true })
  linkOldZone: number;

  @Prop({ required: true })
  zoneLevel: string[];

  @Prop({ required: true })
  zoneIconPath: string;

  @Prop({ required: true })
  zoneIconBlackPath: string;
}

@Schema()
export class Zone extends Document {
  @Prop({ type: Array, required: true })
  lstZone: any[];

  @Prop({ required: true })
  maxZoneEditor: number;

  @Prop({ required: true })
  maxZoneLevel: number;

  @Prop({ required: true })
  updatedAt: string;
}

export const ZoneSchema = SchemaFactory.createForClass(Zone);
