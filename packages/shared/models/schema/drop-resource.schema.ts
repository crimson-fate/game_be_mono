import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class DropResource extends Document {
  @Prop({ type: Array, required: true })
  lstZoneResourceConfigsCampaign: any[];

  @Prop({ type: Object, required: true })
  dicRateDropByLevel: Record<string, any>;

  @Prop({ type: Object, required: true })
  dicRateExpByLevel: Record<string, any>;

  @Prop({ type: Object, required: true })
  dicRateDropByType: Record<string, any>;

  @Prop({ type: Object, required: true })
  dicRateExpByType: Record<string, any>;

  @Prop({ required: true })
  updatedAt: string;
}

export const DropResourceSchema = SchemaFactory.createForClass(DropResource);
