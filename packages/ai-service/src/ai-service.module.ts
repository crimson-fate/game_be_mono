import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiAgentModule } from './agents/ai-agent.module';
import { DatabaseModule } from './database/database.module';
import { ChatHistoryModule } from './chat-history/chat-history.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    ChatHistoryModule,
    AiAgentModule,
  ],
})
export class AiServiceModule {} 