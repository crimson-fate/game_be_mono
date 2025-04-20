import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatHistory, ChatHistoryDocument } from './schemas/chat-history.schema';

@Injectable()
export class ChatHistoryService {
  private readonly logger = new Logger(ChatHistoryService.name);

  constructor(
    @InjectModel(ChatHistory.name)
    private readonly chatHistoryModel: Model<ChatHistoryDocument>,
  ) {}

  async saveChat(
    walletAddress: string,
    message: string,
    response: string,
    metadata?: {
      operationType?: string;
      tokensUsed?: number;
    },
    isOperation: boolean = false,
    operationDetails?: {
      type: string;
      dungeonId: string;
      details?: Record<string, any>;
    },
  ): Promise<ChatHistoryDocument> {
    this.logger.debug(`Saving chat for wallet: ${walletAddress}`);
    this.logger.debug(`Message: ${message}`);
    this.logger.debug(`Response: ${response}`);
    this.logger.debug(`Is Operation: ${isOperation}`);
    this.logger.debug(`Operation Details: ${JSON.stringify(operationDetails)}`);

    try {
      const chat = new this.chatHistoryModel({
        walletAddress,
        message,
        response,
        metadata,
        isOperation,
        operationDetails,
      });

      const savedChat = await chat.save();
      this.logger.debug(`Chat saved successfully with ID: ${savedChat._id}`);
      return savedChat;
    } catch (error) {
      this.logger.error(`Error saving chat: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getChatHistory(walletAddress: string, limit: number = 10): Promise<ChatHistoryDocument[]> {
    return this.chatHistoryModel
      .find({ walletAddress })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getDungeonChatHistory(
    walletAddress: string,
    dungeonId: string,
    limit: number = 50,
    skip: number = 0,
  ): Promise<ChatHistoryDocument[]> {
    try {
      return await this.chatHistoryModel
        .find({
          walletAddress,
          'metadata.dungeonId': dungeonId,
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec();
    } catch (error) {
      this.logger.error(`Error fetching dungeon chat history: ${error.message}`);
      throw error;
    }
  }

  async getOperationHistory(
    walletAddress: string,
    limit: number = 50,
    skip: number = 0,
  ): Promise<ChatHistoryDocument[]> {
    try {
      return await this.chatHistoryModel
        .find({
          walletAddress,
          isOperation: true,
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec();
    } catch (error) {
      this.logger.error(`Error fetching operation history: ${error.message}`);
      throw error;
    }
  }

  async clearChatHistory(walletAddress: string): Promise<void> {
    try {
      await this.chatHistoryModel.deleteMany({ walletAddress }).exec();
    } catch (error) {
      this.logger.error(`Error clearing chat history: ${error.message}`);
      throw error;
    }
  }
} 