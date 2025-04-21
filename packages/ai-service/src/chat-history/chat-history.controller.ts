import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ChatHistoryService } from './chat-history.service';
import { ChatHistoryQueryDto } from './dto/chat-history.dto';
import { ChatHistoryResponseDto } from './dto/chat-history-response.dto';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('Chat History')
@Controller('chat-history')
@UseGuards(AuthGuard)
export class ChatHistoryController {
  constructor(private readonly chatHistoryService: ChatHistoryService) {}

  @Get()
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
      history = await this.chatHistoryService.getDungeonChatHistory(
        walletAddress,
        dungeonId,
        limit,
        skip,
      );
    }
    {
      history = await this.chatHistoryService.getChatHistory(
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
