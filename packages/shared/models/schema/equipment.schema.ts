import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EquipmentDocument = Equipment & Document;

@Schema({ strict: false })
export class Equipment {
  @Prop({ required: true, type: [String] })
  lstSkillVip: string[];

  @Prop({ required: true, type: Object })
  dicStatsCapital: Record<string, number>;

  @Prop({ required: true, type: Object })
  dicUpradeConfig: Record<string, any>;

  @Prop({ required: true, type: Object })
  dicMaxLevelUpgrade: Record<string, number>;

  @Prop({ required: true, type: [Object] })
  lstEquipmentSetConfig: Array<{
    setType: string;
    equipmentElement: string;
    attributeBonus: string;
    dicStackValue: Record<string, number>;
  }>;

  @Prop({ required: true, type: Number })
  offsetMulti: number;

  @Prop({ required: true, type: Number })
  maxParterm: number;

  @Prop({ required: true })
  updatedAt: string;
}

export const EquipmentSchema = SchemaFactory.createForClass(Equipment);
