import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AiAgentService } from './ai-agent.service';
import { ChatDto, ChatResponseDto } from './dto/chat.dto';
import { ChatHistoryQueryDto } from '../chat-history/dto/chat-history.dto';
import { ChatHistoryResponseDto } from '../chat-history/dto/chat-history-response.dto';
import { ApiOperation, ApiResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('AI Chat')
@Controller('ai')
@UseGuards(AuthGuard)
export class AiAgentController {
  constructor(private readonly aiAgentService: AiAgentService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Chat with AI agent Kael' })
  @ApiResponse({
    status: 200,
    description: "Returns Kael's response or operation details",
    type: ChatResponseDto,
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded',
  })
  async chatWithKael(@Body() body: ChatDto): Promise<ChatResponseDto> {
    try {
      const result = await this.aiAgentService.askKael(
        body.message,
        body.walletAddress || 'unknown',
      );

      // Handle different response types from the service
      if (typeof result === 'string') {
        // Simple text response
        return { content: result };
      } else {
        // Dungeon operation response
        return {
          content: `Executing ${result.type} operation on dungeon ${result.dungeonId}`,
          operationType: result.type,
          dungeonId: result.dungeonId,
          details: result.details,
        };
      }
    } catch (error) {
      if (error.message.includes('Rate limit exceeded')) {
        throw new HttpException(error.message, HttpStatus.TOO_MANY_REQUESTS);
      }
      throw new HttpException(
        'An error occurred while processing your request',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('chat/history')
  @ApiOperation({ summary: 'Get chat history for a user' })
  @ApiQuery({ name: 'walletAddress', required: true })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'isOperation', required: false })
  @ApiQuery({ name: 'dungeonId', required: false })
  @ApiResponse({
    status: 200,
    description: 'Returns chat history for the specified user',
    type: [ChatHistoryResponseDto],
  })
  async getChatHistory(
    @Query() query: ChatHistoryQueryDto,
  ): Promise<ChatHistoryResponseDto[]> {
    const { walletAddress, limit, skip, dungeonId } = query;

    let history;
    if (dungeonId) {
      history = await this.aiAgentService.getDungeonChatHistory(
        walletAddress,
        dungeonId,
        limit,
        skip,
      );
    } else {
      history = await this.aiAgentService.getChatHistory(
        walletAddress,
        limit,
      );
    }

    return history.map((chat) => ({
      walletAddress: chat.walletAddress,
      message: chat.message,
      response: chat.response,
      isOperation: chat.isOperation,
      operationDetails: chat.operationDetails,
      createdAt: chat.createdAt,
    }));
  }
}
