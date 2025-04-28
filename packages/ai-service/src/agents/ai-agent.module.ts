import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiAgentController } from './ai-agent.controller';
import { AiAgentService } from './ai-agent.service';
import {
  ChatHistory,
  ChatHistorySchema,
} from '@app/shared/models/schema/chat-history.schema';
import { ChatHistoryService } from './services/chat-history.service';
import {
  AgentPlayerData,
  AgentPlayerDataSchema,
} from '@app/shared/models/schema/agent-player-data.schema';
import { AiDealerAgentService } from './ai-dealer-agent.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatHistory.name, schema: ChatHistorySchema },
      { name: AgentPlayerData.name, schema: AgentPlayerDataSchema },
    ]),
  ],
  controllers: [AiAgentController],
  providers: [AiAgentService, AiDealerAgentService, ChatHistoryService],
  exports: [AiAgentService, AiDealerAgentService],
})
export class AiAgentModule {}
