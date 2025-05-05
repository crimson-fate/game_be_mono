import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import {
  InventoryUser,
  InventoryUserSchema,
} from '@app/shared/models/schema/inventory-user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InventoryUser.name, schema: InventoryUserSchema },
    ]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
