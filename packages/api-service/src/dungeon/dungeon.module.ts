import { Module } from '@nestjs/common';
import { DungeonService } from './dungeon.service';
import { DungeonController } from './dungeon.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Seasons, SeasonSchema } from '@app/shared/models/schema/season.schema';
import {
  SeasonStats,
  SeasonStatsSchema,
} from '@app/shared/models/schema/season-stats.schema';
import {
  PlayerProgress,
  PlayerProgressSchema,
} from '@app/shared/models/schema/player-progress.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Seasons.name, schema: SeasonSchema },
      { name: SeasonStats.name, schema: SeasonStatsSchema },
      { name: PlayerProgress.name, schema: PlayerProgressSchema },
    ]),
  ],
  providers: [DungeonService],
  controllers: [DungeonController],
})
export class DungeonModule {}
