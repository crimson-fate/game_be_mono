import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AiAgentService } from './ai-agent.service';
import { ChatDto, ChatResponseDto } from './dto/chat.dto';

import { ApiOperation, ApiResponse, ApiQuery, ApiTags } from '@nestjs/swagger';

import { ChatHistoryResponseDto } from './dto/chat-history-response.dto';
import { ChatHistoryQueryDto } from './dto/chat-history.dto';

@ApiTags('AI Chat')
@Controller('ai')
export class AiAgentController {
  constructor(private readonly aiAgentService: AiAgentService) {}

  // @Post('chat')
  // @ApiOperation({ summary: 'Chat with AI agent Kael' })
  // @ApiResponse({
  //   status: 200,
  //   description: "Returns Kael's response or operation details",
  //   type: ChatResponseDto,
  // })
  // @ApiResponse({
  //   status: 429,
  //   description: 'Rate limit exceeded',
  // })
  // async chatWithKael(@Body() body: ChatDto): Promise<ChatResponseDto> {
  //   try {
  //     const result = await this.aiAgentService.askKael(
  //       body.message,
  //       body.walletAddress || 'unknown',
  //     );

  //     // Handle different response types from the service
  //     if (typeof result === 'string') {
  //       // Simple text response
  //       return { content: result };
  //     } else {
  //       // Dungeon operation response
  //       return {
  //         content: `Executing ${result.type} operation on dungeon ${result.dungeonId}`,
  //         operationType: result.type,
  //         dungeonId: result.dungeonId,
  //         details: result.details,
  //       };
  //     }
  //   } catch (error) {
  //     if (error.message.includes('Rate limit exceeded')) {
  //       throw new HttpException(error.message, HttpStatus.TOO_MANY_REQUESTS);
  //     }
  //     throw new HttpException(
  //       'An error occurred while processing your request',
  //       HttpStatus.INTERNAL_SERVER_ERROR,
  //     );
  //   }
  // }

  // @Get('chat/history')
  // @ApiOperation({ summary: 'Get chat history for a user' })
  // @ApiQuery({ name: 'walletAddress', required: true })
  // @ApiQuery({ name: 'limit', required: false })
  // @ApiQuery({ name: 'skip', required: false })
  // @ApiQuery({ name: 'isOperation', required: false })
  // @ApiQuery({ name: 'dungeonId', required: false })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Returns chat history for the specified user',
  //   type: [ChatHistoryResponseDto],
  // })
  // async getChatHistory(
  //   @Query() query: ChatHistoryQueryDto,
  // ): Promise<ChatHistoryResponseDto[]> {
  //   const { walletAddress, limit, skip, dungeonId } = query;

  //   let history;
  //   if (dungeonId) {
  //     history = await this.aiAgentService.getDungeonChatHistory(
  //       walletAddress,
  //       dungeonId,
  //       limit,
  //       skip,
  //     );
  //   } else {
  //     history = await this.aiAgentService.getChatHistory(walletAddress, limit);
  //   }

  //   return history.map((chat) => ({
  //     walletAddress: chat.walletAddress,
  //     message: chat.message,
  //     response: chat.response,
  //     isOperation: chat.isOperation,
  //     operationDetails: chat.operationDetails,
  //     createdAt: chat.createdAt,
  //   }));
  // }

  @Get('chat/dealer/start')
  // run function runNegotiationExample().catch(console.error); of the ai-agent.service.ts
  @ApiOperation({ summary: 'Run negotiation example' })
  @ApiResponse({
    status: 200,
    description: 'Returns the result of the negotiation example',
  })
  async runNegotiationExample(@Query() query: ChatDto): Promise<any> {
    try {
      console.log('Running negotiation example...');
      const result = await this.aiAgentService.startNewHagniNegotiation(
        "0x1234567890abcdef",
        {
          baseValue: 100,
          rarityBonus: {
            common: 0,
            rare: 10,
            epic: 20,
            legendary: 30,
          },
          itemCounts: {
            common: 5,
            rare: 3,
            epic: 2,
            legendary: 1,
          },
        },
        {
          minSellRatio: 0.5,
          maxDiscount: 1.5,
        },
        );
      return result;
    } catch (error) {
      console.error('Error running negotiation example:', error);
      throw new HttpException(
        'An error occurred while processing your request',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('chat/dealer')
  // run function runNegotiationExample().catch(console.error); of the ai-agent.service.ts
  @ApiOperation({ summary: 'Run negotiation example' })
  @ApiResponse({
    status: 200,
    description: 'Returns the result of the negotiation example',
  })
  async hagniChat(@Query() query: ChatDto): Promise<any> {
    try {
      console.log('Running negotiation example...');
      const result = await this.aiAgentService.handlePlayerMessage(
        "0x1234567890abcdef",
        query.message
      );
      return result;
    } catch (error) {
      console.error('Error running negotiation example:', error);
      throw new HttpException(
        'An error occurred while processing your request',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
