import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
import { BaseSchema } from './base.schema';

export type UserDocument = User & Document;

@Schema({
  timestamps: true,
})
export class User extends BaseSchema {
  @Prop({ unique: true, sparse: true })
  userAddress?: string;

  @Prop({ type: SchemaTypes.UUID })
  nonce?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
