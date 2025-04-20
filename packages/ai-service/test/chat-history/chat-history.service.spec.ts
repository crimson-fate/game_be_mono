import { Test, TestingModule } from '@nestjs/testing';
import { ChatHistoryService } from '../../src/chat-history/chat-history.service';
import { getModelToken } from '@nestjs/mongoose';
import { ChatHistory } from '../../src/chat-history/schemas/chat-history.schema';
import { Model, Query } from 'mongoose';

describe('ChatHistoryService', () => {
  let service: ChatHistoryService;
  let model: Model<ChatHistory>;

  const mockChatHistory = {
    walletAddress: '0x123...abc',
    message: 'Hello',
    response: 'Hi there!',
    isOperation: false,
    createdAt: new Date(),
  };

  const mockQuery = {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([mockChatHistory]),
  } as unknown as Query<any, any>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatHistoryService,
        {
          provide: getModelToken(ChatHistory.name),
          useValue: {
            create: jest.fn().mockResolvedValue(mockChatHistory),
            find: jest.fn().mockReturnValue(mockQuery),
            deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
          } as Partial<Model<ChatHistory>>,
        },
      ],
    }).compile();

    service = module.get<ChatHistoryService>(ChatHistoryService);
    model = module.get<Model<ChatHistory>>(getModelToken(ChatHistory.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('saveChat', () => {
    it('should save a chat message', async () => {
      const result = await service.saveChat(
        '0x123...abc',
        'Hello',
        'Hi there!',
      );

      expect(result).toEqual(mockChatHistory);
      expect(model.create).toHaveBeenCalledWith({
        walletAddress: '0x123...abc',
        message: 'Hello',
        response: 'Hi there!',
        isOperation: false,
      });
    });

    it('should save an operation chat', async () => {
      const operationDetails = {
        type: 'explore',
        dungeonId: 'dungeon-1',
        details: { area: 'north' },
      };

      const result = await service.saveChat(
        '0x123...abc',
        'Explore north area',
        'Exploring...',
        undefined,
        true,
        operationDetails,
      );

      expect(result).toEqual(mockChatHistory);
      expect(model.create).toHaveBeenCalledWith({
        walletAddress: '0x123...abc',
        message: 'Explore north area',
        response: 'Exploring...',
        isOperation: true,
        operationDetails,
      });
    });
  });

  describe('getChatHistory', () => {
    it('should return chat history for a wallet address', async () => {
      const result = await service.getChatHistory('0x123...abc', 10);

      expect(result).toEqual([mockChatHistory]);
      expect(model.find).toHaveBeenCalledWith({ walletAddress: '0x123...abc' });
      expect(model.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('getDungeonChatHistory', () => {
    it('should return dungeon chat history', async () => {
      const result = await service.getDungeonChatHistory(
        '0x123...abc',
        'dungeon-1',
        10,
        0,
      );

      expect(result).toEqual([mockChatHistory]);
      expect(model.find).toHaveBeenCalledWith({
        walletAddress: '0x123...abc',
        'metadata.dungeonId': 'dungeon-1',
      });
    });
  });

  describe('getOperationHistory', () => {
    it('should return operation history', async () => {
      const result = await service.getOperationHistory('0x123...abc', 10, 0);

      expect(result).toEqual([mockChatHistory]);
      expect(model.find).toHaveBeenCalledWith({
        walletAddress: '0x123...abc',
        isOperation: true,
      });
    });
  });

  describe('clearChatHistory', () => {
    it('should clear chat history for a wallet address', async () => {
      await service.clearChatHistory('0x123...abc');

      expect(model.deleteMany).toHaveBeenCalledWith({
        walletAddress: '0x123...abc',
      });
    });
  });
}); 