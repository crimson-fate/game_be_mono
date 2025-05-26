import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
import { Seasons } from './season.schema';
import { Players } from './player.schema';

export type PlayerProgressDocument = PlayerProgress & Document;
@Schema()
export class PlayerProgress extends Document {
  _id: string;

  @Prop({ type: SchemaTypes.UUID })
  gameId: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Players' })
  player: Players;

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
PlayerProgressSchema.index({ player: 1, season: 1, endTime: 1 });
PlayerProgressSchema.index({ season: 1, isCompleted: -1 });
