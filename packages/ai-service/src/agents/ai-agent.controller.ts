import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AiAgentService } from './ai-agent.service';
import { ChatDto, ChatResponseDto } from './dto/chat.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('ai')
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
}
