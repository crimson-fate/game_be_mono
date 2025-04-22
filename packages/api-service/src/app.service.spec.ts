import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';
import { setupTestApp, teardownTestApp } from '../test/setup';
import { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { join } from 'path';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await setupTestApp(AppModule);
  });

  afterAll(async () => {
    await teardownTestApp(app);
  });

  it('/ (GET) should serve index.html', () => {
    return supertest(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Content-Type', /text\/html/);
  });
}); 