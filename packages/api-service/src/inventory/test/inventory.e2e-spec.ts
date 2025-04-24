import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../app.module';
import { mockGameInventoryData, mockUpdateGameInventoryData } from './mock-data';
import supertest from 'supertest';

describe('InventoryController (e2e)', () => {
  let app: INestApplication;
  let request: ReturnType<typeof supertest>;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    request = supertest(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /inventory', () => {
    it('should create a new inventory', () => {
      return request
        .post('/inventory')
        .send(mockGameInventoryData)
        .expect(201)
        .expect((res) => {
          expect(res.body.walletAddress).toBe(mockGameInventoryData.walletAddress);
          expect(res.body.inventory.sortByType).toBe(mockGameInventoryData.inventory.sortByType);
          expect(res.body.inventory.lstOwned).toHaveLength(1);
          expect(res.body.stats.totalEquipment).toBe(1);
        });
    });
  });

  describe('GET /inventory', () => {
    it('should get inventory by wallet address', () => {
      return request
        .get('/inventory')
        .send({ walletAddress: mockGameInventoryData.walletAddress })
        .expect(200)
        .expect((res) => {
          expect(res.body.walletAddress).toBe(mockGameInventoryData.walletAddress);
          expect(res.body.inventory.sortByType).toBe(mockGameInventoryData.inventory.sortByType);
          expect(res.body.inventory.lstOwned).toHaveLength(1);
        });
    });

    it('should return 404 for non-existent inventory', () => {
      return request
        .get('/inventory')
        .send({ walletAddress: '0x0000000000000000000000000000000000000000' })
        .expect(404);
    });
  });

  describe('PUT /inventory', () => {
    it('should update existing inventory', () => {
      return request
        .put('/inventory')
        .send(mockUpdateGameInventoryData)
        .expect(200)
        .expect((res) => {
          expect(res.body.walletAddress).toBe(mockUpdateGameInventoryData.walletAddress);
          expect(res.body.inventory.sortByType).toBe(mockUpdateGameInventoryData.inventory.sortByType);
          expect(res.body.inventory.lstOwned[0].currentUpradeLevel).toBe(3);
          expect(res.body.inventory.lstOwned[0].currrentRarity).toBe(2);
        });
    });
  });

  describe('DELETE /inventory', () => {
    it('should delete inventory', () => {
      return request
        .delete('/inventory')
        .send({ walletAddress: mockGameInventoryData.walletAddress })
        .expect(200);
    });

    it('should return 404 when trying to delete non-existent inventory', () => {
      return request
        .delete('/inventory')
        .send({ walletAddress: '0x0000000000000000000000000000000000000000' })
        .expect(404);
    });
  });
}); 