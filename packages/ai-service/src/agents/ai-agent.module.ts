import { Module } from '@nestjs/common';
import { MongooseModule, Schema } from '@nestjs/mongoose';
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
import {
  PlayerResource,
  PlayerResourceSchema,
} from '@app/shared/models/schema/player-resource.schema';
import {
  PlayerProgress,
  PlayerProgressSchema,
} from '@app/shared/models/schema/player-progress.schema';
import { DungeonService } from 'api-service/src/dungeon/dungeon.service';
import { Seasons, SeasonSchema } from '@app/shared/models/schema/season.schema';
import { Players, PlayerSchema } from '@app/shared/models/schema/player.schema';
import { PlayersService } from 'api-service/src/players/players.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatHistory.name, schema: ChatHistorySchema },
      { name: AgentPlayerData.name, schema: AgentPlayerDataSchema },
      { name: UserFeedbackData.name, schema: UserFeedbackDataSchema },
      { name: PlayerResource.name, schema: PlayerResourceSchema },
      { name: PlayerProgress.name, schema: PlayerProgressSchema },
      { name: Seasons.name, schema: SeasonSchema },
      { name: Players.name, schema: PlayerSchema },
    ]),
  ],
  controllers: [AiAgentController],
  providers: [
    AiAgentService,
    AiDealerAgentService,
    ChatHistoryService,
    FeedbackService,
    DungeonService,
    PlayersService,
  ],
  exports: [AiAgentService, AiDealerAgentService, FeedbackService],
})
export class AiAgentModule {}
