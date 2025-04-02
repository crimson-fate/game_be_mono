import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PlayerLevelController } from './player-level.controller';
import { PlayerLevelService } from './player-level.service';
import {
  PlayerLevel,
  PlayerLevelSchema,
} from '../../../shared/models/schema/player-level.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PlayerLevel.name, schema: PlayerLevelSchema },
    ]),
  ],
  controllers: [PlayerLevelController],
  providers: [PlayerLevelService],
})
export class PlayerLevelModule {}
