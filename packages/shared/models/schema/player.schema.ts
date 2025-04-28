import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Players extends Document {
  _id: string;

  @Prop()
  address: string;

  @Prop()
  username: string;
}

export const PlayerSchema = SchemaFactory.createForClass(Players);
PlayerSchema.index({ player: 1 });
