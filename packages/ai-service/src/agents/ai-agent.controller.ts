import { Controller, Post, Body } from '@nestjs/common';
import { AiAgentService } from './ai-agent.service';
import { ChatDto } from './dto/chat.dto';

@Controller('ai')
export class AiAgentController {
  constructor(private readonly aiAgentService: AiAgentService) {}

  @Post('chat')
  async chatWithKael(@Body() body: ChatDto): Promise<string> {
    return this.aiAgentService.askKael(body.message);
  }
}
