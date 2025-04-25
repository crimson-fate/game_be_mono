import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  HttpException,
  HttpStatus,
  Param,
  Delete,
  Put,
} from '@nestjs/common';
import { AiAgentService } from './ai-agent.service';
import { ChatDto, ChatResponseDto } from './dto/chat.dto';
import { CreateAgentFarmDto, UpdateAgentFarmDto } from './dto/agent-farm.dto';
import {
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiTags,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('AI Agent')
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
        '0x1234567890abcdef',
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
        '0x1234567890abcdef',
        query.message,
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

  @Post('farm')
  @ApiOperation({ summary: 'Create new agent farm data' })
  @ApiResponse({
    status: 201,
    description: 'Agent farm data created successfully',
  })
  async createAgentFarm(@Body() createAgentFarmDto: CreateAgentFarmDto) {
    try {
      return await this.aiAgentService.createAgentFarmData(createAgentFarmDto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('farm/:walletAddress')
  @ApiOperation({ summary: 'Get agent farm data by wallet address' })
  @ApiParam({
    name: 'walletAddress',
    description: 'Wallet address of the player',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns agent farm data',
  })
  async getAgentFarm(@Param('walletAddress') walletAddress: string) {
    try {
      const data = await this.aiAgentService.getAgentFarmData(walletAddress);
      if (!data) {
        const data = await this.aiAgentService.createAgentFarmData({
          walletAddress: walletAddress,
        });
        return data;
      }
      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put('farm/:walletAddress')
  @ApiOperation({ summary: 'Update agent farm data' })
  @ApiParam({
    name: 'walletAddress',
    description: 'Wallet address of the player',
  })
  @ApiResponse({
    status: 200,
    description: 'Agent farm data updated successfully',
  })
  async updateAgentFarm(
    @Param('walletAddress') walletAddress: string,
    @Body() updateAgentFarmDto: UpdateAgentFarmDto,
  ) {
    try {
      const data = await this.aiAgentService.updateAgentFarmData(
        walletAddress,
        updateAgentFarmDto,
      );
      if (!data) {
        throw new HttpException(
          'Agent farm data not found',
          HttpStatus.NOT_FOUND,
        );
      }
      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete('farm/:walletAddress')
  @ApiOperation({ summary: 'Delete agent farm data' })
  @ApiParam({
    name: 'walletAddress',
    description: 'Wallet address of the player',
  })
  @ApiResponse({
    status: 200,
    description: 'Agent farm data deleted successfully',
  })
  async deleteAgentFarm(@Param('walletAddress') walletAddress: string) {
    try {
      const data = await this.aiAgentService.deleteAgentFarmData(walletAddress);
      if (!data) {
        throw new HttpException(
          'Agent farm data not found',
          HttpStatus.NOT_FOUND,
        );
      }
      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('farm/:walletAddress/claim')
  @ApiOperation({ summary: 'Claim farming rewards' })
  @ApiParam({
    name: 'walletAddress',
    description: 'Wallet address of the player',
  })
  @ApiResponse({
    status: 200,
    description: 'Rewards claimed successfully',
  })
  async claimReward(@Param('walletAddress') walletAddress: string) {
    try {
      return await this.aiAgentService.claimReward(walletAddress);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
