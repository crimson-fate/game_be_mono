import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import mongoose from 'mongoose';

import { ValidationPipe } from '@nestjs/common';
import { configureSwagger } from '@app/shared/config/configSwagger';
import { configureValidation } from '@app/shared/config/configValidation';

import configuration from '@app/shared/configuration';
import * as bodyParser from 'body-parser';
import { REGEX_MATCH_DOMAIN } from '@app/shared/utils/regex';
mongoose.set('debug', true);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = configuration().PORTS.API_SERVICE;

  app.enableCors({
    origin: (origin, callback) => {
      if (REGEX_MATCH_DOMAIN.test(origin) || !origin) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },

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
      `Game API Service is running on port ${port} | Doc Run on http://localhost:${port}/docs`,
    );
  });
}
bootstrap();
