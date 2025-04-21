import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatHistoryService } from './chat-history.service';
import { ChatHistory, ChatHistorySchema } from './schemas/chat-history.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { 
        name: ChatHistory.name, 
        schema: ChatHistorySchema,
        collection: 'chat_history'
      },
    ]),
  ],
  providers: [ChatHistoryService],
  exports: [ChatHistoryService],
})
export class ChatHistoryModule {} 