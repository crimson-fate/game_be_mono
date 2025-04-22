import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HeroesController } from './heroes.controller';
import { HeroesService } from './heroes.service';
import { Hero, HeroSchema } from '@app/shared/models/schema/hero.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Hero.name, schema: HeroSchema }]),
  ],
  controllers: [HeroesController],
  providers: [HeroesService],
})
export class HeroesModule {}
