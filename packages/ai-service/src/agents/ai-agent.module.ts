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
import { AiDealerAgentService } from './services/ai-dealer-agent.service';
import {
  UserFeedbackData,
  UserFeedbackDataSchema,
} from '@app/shared/models/schema/user-feedback.schema';
import { FeedbackService } from './services/feedback.service';
import { PlayerResource, PlayerResourceSchema } from '@app/shared/models/schema/player-resource.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatHistory.name, schema: ChatHistorySchema },
      { name: AgentPlayerData.name, schema: AgentPlayerDataSchema },
      { name: UserFeedbackData.name, schema: UserFeedbackDataSchema },
      { name: PlayerResource.name, schema: PlayerResourceSchema },
    ]),
  ],
  controllers: [AiAgentController],
  providers: [
    AiAgentService,
    AiDealerAgentService,
    ChatHistoryService,
    FeedbackService,
  ],
  exports: [AiAgentService, AiDealerAgentService, FeedbackService],
})
export class AiAgentModule {}
