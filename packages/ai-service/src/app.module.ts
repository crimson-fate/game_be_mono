import { Module } from '@nestjs/common';
import { AiAgentModule } from './agents/ai-agent.module';

@Module({
  imports: [AiAgentModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
