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

  calculateItemCounts(duration: number) {
    const durationInHours = duration / 3600; 
    const dropCount = Math.floor(durationInHours / 2) * 4; // 4 drops every 2 hours
    const rarityDistribution = 
      durationInHours <= 2
        ? { common: 70, great: 25, rare: 5, epic: 0 }
        : durationInHours <= 4
        ? { common: 48, great: 30, rare: 20, epic: 2 }
        : durationInHours <= 8
        ? { common: 35, great: 30, rare: 25, epic: 10 }
        : { common: 20, great: 25, rare: 30, epic: 25 };

    
    var itemCounts = {
      common: 0,
      great: 0,
      rare: 0,
      epic: 0,
    };
    console.log('Calculating item counts for duration:', durationInHours, 'hours');    
    console.log('Item counts:', itemCounts);

    for (let i = 0; i < dropCount; i++) {
      const randomValue = Math.random() * 100;
      if (randomValue < rarityDistribution.epic) {
        itemCounts.epic++;
      } else if (randomValue < rarityDistribution.epic + rarityDistribution.rare) {
        itemCounts.rare++;
      } else if (randomValue < rarityDistribution.epic + rarityDistribution.rare + rarityDistribution.great) {
        itemCounts.great++;
      } else {
        itemCounts.common++;
      }
    }

    return itemCounts;
  }

  @Post('dealer/start')
  @ApiOperation({ summary: 'Start dealing with agent' })
  @ApiResponse({
    status: 200,
    description: 'Agent greets and suggest the initial price',
  })
  async startDealing(@Body() body: ChatDto): Promise<any> {
    try {
      console.log('Running negotiation example...');
      const data = await this.aiAgentService.getAgentFarmData(body.walletAddress);
      if (!data || !data.isFarming) {
        console.log("Can't find agent farm data or farming not started yet");
        throw new HttpException(
          'Agent farm data not found or farming not started',
          HttpStatus.NOT_FOUND,
        );
      }
      console.log("Getting agent welcoming message...");
      const itemCounts = data.itemCounts && data.itemCounts.common ? data.itemCounts : this.calculateItemCounts(data.duration);
      console.log(itemCounts);
      await this.aiAgentService.updateAgentFarmData(body.walletAddress, {
        isFarming: data.isFarming,
        startTime: data.startTime,
        duration: data.duration,
        itemCounts: itemCounts,
      });
      const result = await this.aiAgentService.startNewHagniNegotiation(
        body.walletAddress,
        {
          baseValue: 100,
          rarityBonus: {
            common: 0,
            great: 10,
            rare: 20,
            epic: 30,
          },
          itemCounts: itemCounts
        },
        {
          minSellRatio: 0.5,
          maxDiscount: 1.5,
        },
      );
      console.log(result);
      return result;
    } catch (error) {
      console.error('Error running negotiation example:', error);
      throw new HttpException(
        'An error occurred while processing your request',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('dealer/chat')
  @ApiOperation({ summary: 'Deal with the agent' })
  @ApiResponse({
    status: 200,
    description: 'Returns the result of the negotiation example',
  })
  async hagniChat(@Body() body: ChatDto): Promise<any> {
    try {
      console.log('Running negotiation example...');
      var result = await this.aiAgentService.handlePlayerMessage(
        body.walletAddress,
        body.message,
      );
      if (result.outcome && result.outcome === 'accepted') {
        const data = await this.aiAgentService.getAgentFarmData(body.walletAddress);
        result.itemCounts = data.itemCounts;
        result.extractedOffer = result.extractedOffer;
      }
      return result;
    } catch (error) {
      console.error('Error running negotiation example:', error);
      throw new HttpException(
        'An error occurred while processing your request',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('dealer/end')
  @ApiOperation({ summary: 'End the negotiation' })
  @ApiResponse({
    status: 200,
    description: 'Negotiation ended successfully',
  })
  async endNegotiation(@Body() body: ChatDto): Promise<any> {
    try {
      console.log('Ending negotiation...');
      const data = await this.aiAgentService.getAgentFarmData(body.walletAddress);
      if (!data || !data.isFarming) {
        console.log("Can't find agent farm data or farming not started yet");
        return { message: 'Agent farm data not found or farming not started'};
      }
      await this.aiAgentService.updateAgentFarmData(body.walletAddress, {
        isFarming: false,
        startTime: 0,
        duration: 0,
        itemCounts: null,
      });
      this.aiAgentService.stopAgent();
      return { message: 'Negotiation ended successfully' };
    } catch (error) {
      console.error('Error ending negotiation:', error);
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
}
