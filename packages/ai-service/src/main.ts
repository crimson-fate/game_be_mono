import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import mongoose from 'mongoose';

import { ValidationPipe } from '@nestjs/common';
import { configureSwagger } from '@app/shared/config/configSwagger';
import { configureValidation } from '@app/shared/config/configValidation';

import configuration from '@app/shared/configuration';
import * as bodyParser from 'body-parser';

mongoose.set('debug', true);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = configuration().PORT.AI;

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Authorization,Content-Type, Accept',
    credentials: true,
  });
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
  configureSwagger(app);
  configureValidation(app);
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(port, () => {
    console.log(
      `AI Service is running on port ${port} | Doc Run on http://localhost:${port}/docs`,
    );
  });
}
bootstrap();
