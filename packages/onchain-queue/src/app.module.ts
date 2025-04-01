import { BullModule } from '@nestjs/bull';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';
import configuration from '@app/shared/configuration';
import { RegisterModule } from './queue/names/register.module';
import { TransferNameModule } from './queue/names/transfer.module';
import { TextChangedModule } from './queue/names/textChanged.module';
import { RenewModule } from './queue/names/renew.module';
import { UpdateMetaIPModule } from './queue/ip-assets/updateMetaIP.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    MongooseModule.forRoot(configuration().MONGODB_URI),
    BullModule.forRoot({
      redis: {
        host: configuration().REDIS.HOST,
        port: configuration().REDIS.PORT,
      },
    }),
    RegisterModule,
    RenewModule,
    TransferNameModule,
    UpdateMetaIPModule,
    TextChangedModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
