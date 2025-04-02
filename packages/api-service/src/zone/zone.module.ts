import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ZoneController } from './zone.controller';
import { ZoneService } from './zone.service';
import { Zone, ZoneSchema } from '../../../shared/models/schema/zone.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Zone.name, schema: ZoneSchema }]),
  ],
  controllers: [ZoneController],
  providers: [ZoneService],
})
export class ZoneModule {}
