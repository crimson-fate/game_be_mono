import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ZoneRewardController } from './zone-reward.controller';
import { ZoneRewardService } from './zone-reward.service';
import {
  ZoneReward,
  ZoneRewardSchema,
} from '../../../shared/models/schema/zone-reward.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ZoneReward.name, schema: ZoneRewardSchema },
    ]),
  ],
  controllers: [ZoneRewardController],
  providers: [ZoneRewardService],
})
export class ZoneRewardModule {}
