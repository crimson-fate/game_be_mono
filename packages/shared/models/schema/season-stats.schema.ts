import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
import { Seasons } from './season.schema';

@Schema()
export class SeasonStats extends Document {
  _id: string;

  @Prop()
  player: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Season' })
  seasonId: Seasons;

  @Prop()
  totalWave: number;
}

export const SeasonStatsSchema = SchemaFactory.createForClass(SeasonStats);
