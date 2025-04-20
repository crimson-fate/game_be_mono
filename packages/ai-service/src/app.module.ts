import { Module } from '@nestjs/common';
import { AiAgentModule } from './agents/ai-agent.module';
import configuration from '@app/shared/configuration';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(configuration().MONGODB_URI),
    AiAgentModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
