import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class PlayerLevel extends Document {
  @Prop({ required: true })
  startEnergyCapital: number;

  @Prop({ required: true })
  maxMaxEnergyCapital: number;

  @Prop({ required: true })
  levelUpCashBonus: number;

  @Prop({ required: true })
  leveUpEnergyBonus: number;

  @Prop({ required: true })
  levelUpEnergyCapitalBonus: number;

  @Prop({ required: true })
  timeRecoverEnergy: number;

  @Prop({ type: Array, required: true })
  lstLevelExp: number[];

  @Prop({ required: true })
  updatedAt: string;
}

export const PlayerLevelSchema = SchemaFactory.createForClass(PlayerLevel);
