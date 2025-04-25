import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({
  timestamps: true,
})
export class Seasons extends Document {
  _id: string;

  @Prop()
  name: string;

  @Prop()
  startDate: number;

  @Prop()
  endDate: number;
}

export const SeasonSchema = SchemaFactory.createForClass(Seasons);
