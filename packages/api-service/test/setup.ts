import { MongoMemoryServer } from 'mongodb-memory-server';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { join } from 'path';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { getConnectionToken } from '@nestjs/mongoose';

let mongod: MongoMemoryServer;

export async function setupTestApp(module: any): Promise<INestApplication> {
  // Create MongoDB Memory Server instance
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
      }),
      MongooseModule.forRootAsync({
        useFactory: async () => ({
          uri,
          useNewUrlParser: true,
          useUnifiedTopology: true,
        }),
      }),
      ServeStaticModule.forRoot({
        rootPath: join(__dirname, '../src/public'),
        serveRoot: '/',
      }),
      module,
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();

  // Get the mongoose connection and wait for it to be ready
  const connection = app.get(getConnectionToken());
  await connection.readyState;

  return app;
}

export async function teardownTestApp(app: INestApplication) {
  if (app) {
    const connection = app.get(getConnectionToken());
    await connection.close();
    await app.close();
    if (mongod) {
      await mongod.stop();
    }
  }
}
