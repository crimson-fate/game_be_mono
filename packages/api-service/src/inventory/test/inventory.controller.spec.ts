import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { setupTestApp, teardownTestApp } from './setup';
import { mockInventoryData, mockUpdateInventoryData } from './mock-data';

describe('InventoryController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await setupTestApp();
  });

  afterAll(async () => {
    await teardownTestApp();
  });

  describe('POST /inventory', () => {
    it('should create a new inventory', () => {
      return request(app.getHttpServer())
        .post('/inventory')
        .send(mockInventoryData)
        .expect(201)
        .expect((res) => {
          expect(res.body.walletAddress).toBe(mockInventoryData.walletAddress);
          expect(res.body.inventory.items).toHaveLength(2);
          expect(res.body.inventory.equipment).toHaveLength(1);
          expect(res.body.stats.totalItems).toBe(2);
          expect(res.body.stats.totalEquipment).toBe(1);
        });
    });
  });

  describe('GET /inventory', () => {
    it('should get inventory by wallet address', () => {
      return request(app.getHttpServer())
        .get('/inventory')
        .send({ walletAddress: mockInventoryData.walletAddress })
        .expect(200)
        .expect((res) => {
          expect(res.body.walletAddress).toBe(mockInventoryData.walletAddress);
          expect(res.body.inventory.items).toHaveLength(2);
          expect(res.body.inventory.equipment).toHaveLength(1);
        });
    });

    it('should return 404 for non-existent inventory', () => {
      return request(app.getHttpServer())
        .get('/inventory')
        .send({ walletAddress: '0x0000000000000000000000000000000000000000' })
        .expect(404);
    });
  });

  describe('PUT /inventory', () => {
    it('should update existing inventory', () => {
      return request(app.getHttpServer())
        .put('/inventory')
        .send(mockUpdateInventoryData)
        .expect(200)
        .expect((res) => {
          expect(res.body.walletAddress).toBe(mockUpdateInventoryData.walletAddress);
          expect(res.body.inventory.items[0].quantity).toBe(2);
          expect(res.body.inventory.items[1].quantity).toBe(10);
          expect(res.body.inventory.equipment[0].level).toBe(5);
          expect(res.body.inventory.resources.gold).toBe(2000);
        });
    });
  });

  describe('DELETE /inventory', () => {
    it('should delete inventory', () => {
      return request(app.getHttpServer())
        .delete('/inventory')
        .send({ walletAddress: mockInventoryData.walletAddress })
        .expect(200);
    });

    it('should return 404 when trying to delete non-existent inventory', () => {
      return request(app.getHttpServer())
        .delete('/inventory')
        .send({ walletAddress: '0x0000000000000000000000000000000000000000' })
        .expect(404);
    });
  });
}); 