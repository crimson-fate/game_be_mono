import { Test, TestingModule } from '@nestjs/testing';
import { AiAgentService } from './ai-agent.service';
import { ChatHistoryService } from './services/chat-history.service';
import { getModelToken } from '@nestjs/mongoose';
import { ChatHistory } from '../../../shared/models/schema/chat-history.schema';
import { Model } from 'mongoose';

describe('AiAgentService', () => {
  let service: AiAgentService;
  let chatHistoryService: ChatHistoryService;
  let chatHistoryModel: Model<ChatHistory>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiAgentService,
        ChatHistoryService,
        {
          provide: getModelToken(ChatHistory.name),
          useValue: {
            create: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AiAgentService>(AiAgentService);
    chatHistoryService = module.get<ChatHistoryService>(ChatHistoryService);
    chatHistoryModel = module.get<Model<ChatHistory>>(
      getModelToken(ChatHistory.name),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('askKael', () => {
    it('should handle rate limit exceeded', async () => {
      jest.spyOn(service['rateLimiter'], 'checkLimit').mockResolvedValue(false);
      jest.spyOn(service['rateLimiter'], 'getResetTime').mockReturnValue(5000);

      await expect(
        service.askKael('test message', 'test-client', 'test-wallet'),
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle common queries', async () => {
      jest.spyOn(service['rateLimiter'], 'checkLimit').mockResolvedValue(true);

      const response = await service.askKael(
        'hello',
        'test-client',
        'test-wallet',
      );
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
    });

    it('should handle dungeon operations', async () => {
      jest.spyOn(service['rateLimiter'], 'checkLimit').mockResolvedValue(true);
      jest.spyOn(service['agent'], 'run').mockResolvedValue({
        operation: 'clean',
        dungeonId: 'test-dungeon',
        details: { area: 'north' },
      });

      const response = await service.askKael(
        'clean the north area',
        'test-client',
        'test-wallet',
      );

      expect(response).toBeDefined();
      expect(typeof response).toBe('object');
      expect(response).toHaveProperty('type', 'clean');
      expect(response).toHaveProperty('dungeonId', 'test-dungeon');
    });

    it('should save chat history', async () => {
      jest.spyOn(service['rateLimiter'], 'checkLimit').mockResolvedValue(true);
      jest.spyOn(chatHistoryService, 'saveChat').mockResolvedValue(undefined);

      await service.askKael('test message', 'test-client', 'test-wallet');

      expect(chatHistoryService.saveChat).toHaveBeenCalledWith(
        'test-client',
        'test-wallet',
        'test message',
        expect.any(String),
        expect.any(Object),
        false,
        undefined,
      );
    });
  });
});
