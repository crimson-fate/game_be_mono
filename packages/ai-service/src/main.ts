import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import mongoose from 'mongoose';

import { ValidationPipe } from '@nestjs/common';
import { configureSwagger } from '@app/shared/config/configSwagger';
import { configureValidation } from '@app/shared/config/configValidation';
import { json, urlencoded } from 'express';
import configuration from '@app/shared/configuration';
// import * as bodyParser from 'body-parser';

mongoose.set('debug', true);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = configuration().PORT.AI;

  app.enableCors({
    origin: '*',
  });
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
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
