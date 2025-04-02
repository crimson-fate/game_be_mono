import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DropResourceController } from './drop-resource.controller';
import { DropResourceService } from './drop-resource.service';
import {
  DropResource,
  DropResourceSchema,
} from '@app/shared/models/schema/drop-resource.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DropResource.name, schema: DropResourceSchema },
    ]),
  ],
  controllers: [DropResourceController],
  providers: [DropResourceService],
})
export class DropResourceModule {}
