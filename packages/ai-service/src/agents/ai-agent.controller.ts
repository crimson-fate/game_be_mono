import { Controller, Post, Body } from '@nestjs/common';
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
  async chatWithKael(@Body() body: ChatDto): Promise<ChatResponseDto> {
    const result = await this.aiAgentService.askKael(body.message);

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
  }
}
