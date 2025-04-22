import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InventoryService } from '../inventory.service';
import { InventoryUser } from '@app/shared/models/schema/inventory-user.schema';
import { mockInventoryData, mockUpdateInventoryData } from './mock-data';

describe('InventoryService', () => {
  let service: InventoryService;
  let model: Model<InventoryUser>;

  function MockModel(data: any) {
    this.data = data;
    this.save = jest.fn().mockResolvedValue(this.data);
  }

  const mockModel = {
    create: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    deleteOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: getModelToken(InventoryUser.name),
          useValue: {
            ...mockModel,
            prototype: MockModel.prototype,
            constructor: MockModel
          },
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    model = module.get<Model<InventoryUser>>(getModelToken(InventoryUser.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new inventory', async () => {
      const createdInventory = {
        ...mockInventoryData,
        stats: {
          totalItems: 2,
          totalEquipment: 1,
          lastUpdated: new Date(),
        },
      };

      mockModel.create.mockResolvedValue(createdInventory);

      const result = await service.create(mockInventoryData);

      expect(mockModel.create).toHaveBeenCalledWith({
        walletAddress: mockInventoryData.walletAddress,
        inventory: mockInventoryData.inventory,
        stats: {
          totalItems: mockInventoryData.inventory.items.length,
          totalEquipment: mockInventoryData.inventory.equipment.length,
          lastUpdated: expect.any(Date),
        },
      });

      expect(result).toEqual(createdInventory);
    });
  });

  describe('get', () => {
    it('should return inventory by wallet address', async () => {
      const foundInventory = {
        ...mockInventoryData,
        stats: {
          totalItems: 2,
          totalEquipment: 1,
          lastUpdated: new Date(),
        },
      };

      mockModel.findOne.mockResolvedValue(foundInventory);

      const result = await service.get({ walletAddress: mockInventoryData.walletAddress });

      expect(mockModel.findOne).toHaveBeenCalledWith({
        walletAddress: mockInventoryData.walletAddress,
      });

      expect(result).toEqual(foundInventory);
    });
  });

  describe('update', () => {
    it('should update existing inventory', async () => {
      const updatedInventory = {
        ...mockUpdateInventoryData,
        stats: {
          totalItems: 2,
          totalEquipment: 1,
          lastUpdated: new Date(),
        },
      };

      mockModel.findOneAndUpdate.mockResolvedValue(updatedInventory);

      const result = await service.update(mockUpdateInventoryData);

      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { walletAddress: mockUpdateInventoryData.walletAddress },
        {
          $set: {
            inventory: mockUpdateInventoryData.inventory,
            stats: {
              totalItems: mockUpdateInventoryData.inventory.items.length,
              totalEquipment: mockUpdateInventoryData.inventory.equipment.length,
              lastUpdated: expect.any(Date),
            },
          },
        },
        { new: true, upsert: true },
      );

      expect(result).toEqual(updatedInventory);
    });
  });

  describe('delete', () => {
    it('should delete inventory', async () => {
      mockModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

      await service.delete({ walletAddress: mockInventoryData.walletAddress });

      expect(mockModel.deleteOne).toHaveBeenCalledWith({
        walletAddress: mockInventoryData.walletAddress,
      });
    });
  });
}); 