import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiAgentModule } from './agents/ai-agent.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,

    AiAgentModule,
  ],
})
export class AiServiceModule {}
