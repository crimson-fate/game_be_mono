import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ZoneRewardDocument = ZoneReward & Document;

@Schema({ strict: false })
export class ZoneReward {
  @Prop({ required: true, type: Array })
  lstZoneRewardConfigCampaign: any[];

  @Prop({ required: true, type: Array })
  lstZoneRewardConfigInferno: any[];

  @Prop({ required: true })
  updatedAt: string;
}

export const ZoneRewardSchema = SchemaFactory.createForClass(ZoneReward);
