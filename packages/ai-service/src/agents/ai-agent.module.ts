import { Module } from '@nestjs/common';
import { AiAgentService } from './ai-agent.service';
import { AiAgentController } from './ai-agent.controller';

@Module({
  providers: [AiAgentService],
  controllers: [AiAgentController],
})
export class AiAgentModule {}
