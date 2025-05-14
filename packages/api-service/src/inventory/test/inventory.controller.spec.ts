import { Test, TestingModule } from '@nestjs/testing';
import { InventoryController } from '../inventory.controller';
import { InventoryService } from '../inventory.service';
import {
  CreateGameInventoryDto,
  GetGameInventoryDto,
  UpdateGameInventoryDto,
} from '../dto/inventory.dto';
import {
  mockGameInventoryData,
  mockUpdateGameInventoryData,
} from './mock-data';

describe('InventoryController', () => {
  let controller: InventoryController;
  let service: InventoryService;

  const mockInventoryService = {
    create: jest.fn(),
    update: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        {
          provide: InventoryService,
          useValue: mockInventoryService,
        },
      ],
    }).compile();

    controller = module.get<InventoryController>(InventoryController);
    service = module.get<InventoryService>(InventoryService);
  });

  describe('create', () => {
    it('should create a new inventory', async () => {
      const createDto: CreateGameInventoryDto = mockGameInventoryData;
      const expectedResult = { ...createDto, id: '1' };
      mockInventoryService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createDto);
      expect(result).toEqual(expectedResult);
      expect(mockInventoryService.create).toHaveBeenCalledWith(createDto);
    });

    it('should handle empty inventory data', async () => {
      const createDto: CreateGameInventoryDto = {
        walletAddress: '0x123',
        inventory: {
          sortByType: false,
          lstOwned: [],
          dicEquippedKey: {},
        },
      };
      const expectedResult = { ...createDto, id: '1' };
      mockInventoryService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createDto);
      expect(result).toEqual(expectedResult);
      expect(mockInventoryService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('update', () => {
    it('should update an existing inventory', async () => {
      const updateDto: UpdateGameInventoryDto = mockUpdateGameInventoryData;
      const expectedResult = { ...updateDto, id: '1' };
      mockInventoryService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(updateDto);
      expect(result).toEqual(expectedResult);
      expect(mockInventoryService.update).toHaveBeenCalledWith(updateDto);
    });

    it('should handle empty inventory data', async () => {
      const updateDto: UpdateGameInventoryDto = {
        walletAddress: '0x123',
        inventory: {
          sortByType: false,
          lstOwned: [],
          dicEquippedKey: {},
        },
      };
      const expectedResult = { ...updateDto, id: '1' };
      mockInventoryService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(updateDto);
      expect(result).toEqual(expectedResult);
      expect(mockInventoryService.update).toHaveBeenCalledWith(updateDto);
    });
  });

  describe('get', () => {
    it('should return inventory for a wallet address', async () => {
      const getDto: GetGameInventoryDto = {
        walletAddress: '0x123',
      };
      const expectedResult = {
        ...mockGameInventoryData,
        id: '1',
      };
      mockInventoryService.get.mockResolvedValue(expectedResult);

      const result = await controller.get(getDto);
      expect(result).toEqual(expectedResult);
      expect(mockInventoryService.get).toHaveBeenCalledWith(getDto);
    });
  });

  describe('delete', () => {
    it('should delete inventory for a wallet address', async () => {
      const getDto: GetGameInventoryDto = {
        walletAddress: '0x123',
      };
      const expectedResult = { success: true };
      mockInventoryService.delete.mockResolvedValue(expectedResult);

      const result = await controller.delete(getDto);
      expect(result).toEqual(expectedResult);
      expect(mockInventoryService.delete).toHaveBeenCalledWith(getDto);
    });
  });

  describe('error handling', () => {
    it('should handle service errors when creating inventory', async () => {
      const createDto: CreateGameInventoryDto = mockGameInventoryData;
      const error = new Error('Service error');
      mockInventoryService.create.mockRejectedValue(error);

      await expect(controller.create(createDto)).rejects.toThrow(
        'Service error',
      );
    });

    it('should handle service errors when updating inventory', async () => {
      const updateDto: UpdateGameInventoryDto = mockUpdateGameInventoryData;
      const error = new Error('Service error');
      mockInventoryService.update.mockRejectedValue(error);

      await expect(controller.update(updateDto)).rejects.toThrow(
        'Service error',
      );
    });

    it('should handle service errors when getting inventory', async () => {
      const getDto: GetGameInventoryDto = {
        walletAddress: '0x123',
      };
      const error = new Error('Service error');
      mockInventoryService.get.mockRejectedValue(error);

      await expect(controller.get(getDto)).rejects.toThrow('Service error');
    });

    it('should handle service errors when deleting inventory', async () => {
      const getDto: GetGameInventoryDto = {
        walletAddress: '0x123',
      };
      const error = new Error('Service error');
      mockInventoryService.delete.mockRejectedValue(error);

      await expect(controller.delete(getDto)).rejects.toThrow('Service error');
    });
  });
});
