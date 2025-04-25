import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiAgentModule } from './agents/ai-agent.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    AiAgentModule,
  ],
})
export class AiServiceModule {}
