import { Test, TestingModule } from '@nestjs/testing';
import { ChatHistoryController } from '../../src/chat-history/chat-history.controller';
import { ChatHistoryService } from '../../src/agents/services/chat-history.service';
import { getModelToken } from '@nestjs/mongoose';
import { ChatHistory } from '../../../shared/models/schema/chat-history.schema';
import { Model } from 'mongoose';

describe('ChatHistoryController', () => {
  let controller: ChatHistoryController;
  let service: ChatHistoryService;
  let model: Model<ChatHistory>;

  const mockChatHistory = {
    walletAddress: '0x123...abc',
    message: 'Hello',
    response: 'Hi there!',
    isOperation: false,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatHistoryController],
      providers: [
        ChatHistoryService,
        {
          provide: getModelToken(ChatHistory.name),
          useValue: {
            find: jest.fn().mockReturnThis(),
            sort: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue([mockChatHistory]),
          },
        },
      ],
    }).compile();

    controller = module.get<ChatHistoryController>(ChatHistoryController);
    service = module.get<ChatHistoryService>(ChatHistoryService);
    model = module.get<Model<ChatHistory>>(getModelToken(ChatHistory.name));
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getChatHistory', () => {
    it('should return chat history for a wallet address', async () => {
      const query = {
        walletAddress: '0x123...abc',
        limit: 10,
        skip: 0,
      };

      const result = await controller.getChatHistory(query);
      expect(result).toEqual([mockChatHistory]);
      expect(model.find).toHaveBeenCalledWith({
        walletAddress: query.walletAddress,
      });
    });

    it('should return operation history when isOperation is true', async () => {
      const query = {
        walletAddress: '0x123...abc',
        limit: 10,
        skip: 0,
        isOperation: true,
      };

      const result = await controller.getChatHistory(query);
      expect(result).toEqual([mockChatHistory]);
      expect(model.find).toHaveBeenCalledWith({
        walletAddress: query.walletAddress,
        isOperation: true,
      });
    });

    it('should return dungeon chat history when dungeonId is provided', async () => {
      const query = {
        walletAddress: '0x123...abc',
        limit: 10,
        skip: 0,
        dungeonId: 'dungeon-1',
      };

      const result = await controller.getChatHistory(query);
      expect(result).toEqual([mockChatHistory]);
      expect(model.find).toHaveBeenCalledWith({
        walletAddress: query.walletAddress,
        'metadata.dungeonId': query.dungeonId,
      });
    });

    it('should handle pagination correctly', async () => {
      const query = {
        walletAddress: '0x123...abc',
        limit: 20,
        skip: 10,
      };

      await controller.getChatHistory(query);
      expect(model.limit).toHaveBeenCalledWith(query.limit);
      expect(model.skip).toHaveBeenCalledWith(query.skip);
    });
  });
});
