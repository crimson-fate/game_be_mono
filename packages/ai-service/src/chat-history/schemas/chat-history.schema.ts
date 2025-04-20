import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ChatHistoryDocument = ChatHistory & Document;

@Schema({ timestamps: true })
export class ChatHistory {
  @Prop({ required: true, index: true })
  walletAddress: string;

  @Prop({ required: true })
  message: string;

  @Prop({ required: true })
  response: string;

  @Prop({ type: Object })
  metadata?: {
    operationType?: string;
    tokensUsed?: number;
  };

  @Prop({ default: false })
  isOperation: boolean;

  @Prop({ type: Object })
  operationDetails?: {
    type: string;
    dungeonId: string;
    details?: Record<string, any>;
  };
}

export const ChatHistorySchema = SchemaFactory.createForClass(ChatHistory); 