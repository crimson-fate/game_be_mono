import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ServeStaticModule } from '@nestjs/serve-static';
import { resolve } from 'path';

import { HeroesModule } from './heroes/heroes.module';
import { EquipmentModule } from './equipment/equipment.module';
import { PlayerLevelModule } from './player-level/player-level.module';
import { ShopModule } from './shop/shop.module';
import { ZoneModule } from './zone/zone.module';
import { DropResourceModule } from './drop-resource/drop-resource.module';
import { ZoneRewardModule } from './zone-reward/zone-reward.module';
import configuration from '@app/shared/configuration';
import { FallbackController } from './fallback.controller';
import { InventoryModule } from './inventory/inventory.module';
import { DungeonModule } from './dungeon/dungeon.module';
import { PlayerResourceModule } from './player-resource/player-resource.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(configuration().MONGODB_URI),

    ServeStaticModule.forRoot({
      rootPath: resolve(__dirname, 'public'), // 😬 fragile
      serveRoot: '/',
    }),
    HeroesModule,
    EquipmentModule,
    PlayerLevelModule,
    ShopModule,
    ZoneModule,
    DropResourceModule,
    ZoneRewardModule,
    InventoryModule,
    DungeonModule,
    PlayerResourceModule,
  ],
  controllers: [FallbackController],
})
export class AppModule {}
