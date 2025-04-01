import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';
import configuration from '@app/shared/configuration';
import { BlockDetectionModule } from './block-detection/block-detection.module';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
    }),
    MongooseModule.forRoot(configuration().MONGODB_URI),
    BlockDetectionModule,
    BullModule.forRoot({
      redis: {
        host: configuration().REDIS.HOST,
        port: configuration().REDIS.PORT,
      },
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
