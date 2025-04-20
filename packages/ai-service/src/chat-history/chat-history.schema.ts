import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class ChatHistory extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  walletAddress: string;

  @Prop({ required: true })
  message: string;

  @Prop({ required: true })
  response: string;

  @Prop({ type: Object, required: false })
  metadata?: {
    dungeonId?: string;
    operationType?: string;
    timestamp?: Date;
    tokensUsed?: number;
  };

  @Prop({ default: false })
  isOperation: boolean;

  @Prop({ type: Object, required: false })
  operationDetails?: {
    type?: string;
    dungeonId?: string;
    details?: Record<string, any>;
  };
}

export const ChatHistorySchema = SchemaFactory.createForClass(ChatHistory); 