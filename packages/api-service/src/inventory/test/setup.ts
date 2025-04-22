import { MongoMemoryServer } from 'mongodb-memory-server';
import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { InventoryModule } from '../inventory.module';
import { INestApplication } from '@nestjs/common';

let mongod: MongoMemoryServer;
let app: INestApplication;

export async function setupTestApp() {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      MongooseModule.forRoot(uri),
      InventoryModule,
    ],
  }).compile();

  app = moduleFixture.createNestApplication();
  await app.init();

  return app;
}

export async function teardownTestApp() {
  if (app) {
    await app.close();
  }
  if (mongod) {
    await mongod.stop();
  }
} 