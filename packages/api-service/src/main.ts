import { NestExpressApplication } from '@nestjs/platform-express';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import mongoose from 'mongoose';

import { ValidationPipe } from '@nestjs/common';
import { configureSwagger } from '@app/shared/config/configSwagger';
import { configureValidation } from '@app/shared/config/configValidation';

import configuration from '@app/shared/configuration';
import { json, urlencoded } from 'express';

mongoose.set('debug', true);

async function bootstrap() {
  // const app = await NestFactory.create(AppModule);
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const port = configuration().PORT.API;
  const whitelist = [
    'https://crimsonfate.starkarcade.com',
    'https://be-crimsonfate.starkarcade.com',
    'https://ai-crimsonfate.crimsonfate.xyz',
    'http://localhost:8001',
    'http://localhost:8000',
  ];

  app.enableCors({
    origin: function (origin, callback) {
      if (!origin || whitelist.indexOf(origin) !== -1) {
        console.log('AI Allowed cors for:', origin ? origin : 'Localhost');
        callback(null, true);
      } else {
        console.log('blocked cors for:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  configureSwagger(app);
  configureValidation(app);
  app.useGlobalPipes(new ValidationPipe());

  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  await app.listen(port, () => {
    console.log(
      `Game API Service is running on port ${port} | Doc Run on http://localhost:${port}/docs | API Run on http://localhost:${port}`,
    );
  });
}
bootstrap();
