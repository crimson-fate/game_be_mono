import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
import { Seasons } from './season.schema';

@Schema()
export class PlayerProgress extends Document {
  _id: string;

  @Prop()
  player: string;

  @Prop()
  wave: number;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Seasons' })
  season: Seasons;

  @Prop()
  startTime: number;

  @Prop()
  endTime: number;

  @Prop()
  isCompleted: boolean;
}

export const PlayerProgressSchema =
  SchemaFactory.createForClass(PlayerProgress);
PlayerProgressSchema.index({ player: 1 });
