import { Module } from '@nestjs/common';
import { DungeonService } from './dungeon.service';
import { DungeonController } from './dungeon.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Seasons, SeasonSchema } from '@app/shared/models/schema/season.schema';
import { Players, PlayerSchema } from '@app/shared/models/schema/player.schema';
import {
  PlayerProgress,
  PlayerProgressSchema,
} from '@app/shared/models/schema/player-progress.schema';
import { PlayersService } from '../players/players.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Seasons.name, schema: SeasonSchema },
      { name: Players.name, schema: PlayerSchema },
      { name: PlayerProgress.name, schema: PlayerProgressSchema },
    ]),
  ],
  providers: [DungeonService, PlayersService],
  controllers: [DungeonController],
})
export class DungeonModule {}
