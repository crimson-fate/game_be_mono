import {
  PlayerResource,
  PlayerResourceSchema,
} from '@app/shared/models/schema/player-resource.schema';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PlayerResourceController } from './player-resource.controller';
import { PlayerResourceService } from './player-resource.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PlayerResource.name, schema: PlayerResourceSchema },
    ]),
  ],
  controllers: [PlayerResourceController],
  providers: [PlayerResourceService],
})
export class PlayerResourceModule {}
