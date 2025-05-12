import {
  Controller,
  Post,
  Body,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Delete,
  Put,
} from '@nestjs/common';
import { AiAgentService } from './ai-agent.service';
import { ChatDto, FeedbackDto } from './dto/chat.dto';
import { CreateAgentFarmDto, UpdateAgentFarmDto } from './dto/agent-farm.dto';
import { ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import { AiDealerAgentService } from './services/ai-dealer-agent.service';
import { ChatHistoryService } from './services/chat-history.service';
import { AiFeedbackService } from './services/ai-feedback.service';

@ApiTags('AI Agent')
@Controller('ai')
export class AiAgentController {
  constructor(
    private readonly aiAgentService: AiAgentService,
    private readonly aiDealerAgentService: AiDealerAgentService,
    private readonly aiFeedBackService: AiFeedbackService,
    private readonly chatHistoryService: ChatHistoryService,
  ) {}

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

    const itemCounts = {
      common: 0,
      great: 0,
      rare: 0,
      epic: 0,
    };
    console.log(
      'Calculating item counts for duration:',
      durationInHours,
      'hours',
    );
    console.log('Item counts:', itemCounts);

    for (let i = 0; i < dropCount; i++) {
      const randomValue = Math.random() * 100;
      if (randomValue < rarityDistribution.epic) {
        itemCounts.epic++;
      } else if (
        randomValue <
        rarityDistribution.epic + rarityDistribution.rare
      ) {
        itemCounts.rare++;
      } else if (
        randomValue <
        rarityDistribution.epic +
          rarityDistribution.rare +
          rarityDistribution.great
      ) {
        itemCounts.great++;
      } else {
        itemCounts.common++;
      }
    }

    return itemCounts;
  }

  @Post('normal/start')
  @ApiOperation({ summary: 'Start chatting with agent' })
  @ApiResponse({
    status: 200,
    description: 'Agent greets',
  })
  async startChatting(@Body() body: ChatDto): Promise<any> {
    try {
      const result = await this.aiAgentService.initializeFarmerAgent(
        body.walletAddress,
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

  @Post('normal/chat')
  @ApiOperation({ summary: 'Chat with the agent' })
  @ApiResponse({
    status: 200,
    description: 'Response from the agent',
  })
  async normalChat(@Body() body: ChatDto): Promise<any> {
    try {
      console.log('Running negotiation example...');
      const result = await this.aiAgentService.handlePlayerMessage(
        body.walletAddress,
        body.message,
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

  @Post('normal/end')
  @ApiOperation({ summary: 'End the chat' })
  @ApiResponse({
    status: 200,
    description: 'Chat ended successfully',
  })
  async endChat(): Promise<any> {
    try {
      console.log('Ending chat...');
      const result = await this.aiAgentService.stopAgent();
      return result;
    } catch (error) {
      console.error('Error ending chat:', error);
      throw new HttpException(
        'An error occurred while processing your request',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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
      const data = await this.aiDealerAgentService.getAgentFarmData(
        body.walletAddress,
      );
      if (!data || !data.isFarming) {
        console.log("Can't find agent farm data or farming not started yet");
        throw new HttpException(
          'Agent farm data not found or farming not started',
          HttpStatus.NOT_FOUND,
        );
      }
      console.log('Getting agent welcoming message...');
      const itemCounts =
        data.itemCounts && data.itemCounts.common
          ? data.itemCounts
          : this.calculateItemCounts(data.duration);
      console.log(itemCounts);
      await this.aiDealerAgentService.updateAgentFarmData(body.walletAddress, {
        isFarming: data.isFarming,
        startTime: data.startTime,
        duration: data.duration,
        itemCounts: itemCounts,
      });
      const result = await this.aiDealerAgentService.startNewHagniNegotiation(
        body.walletAddress,
        {
          baseValue: 100,
          rarityBonus: {
            common: 0,
            great: 10,
            rare: 20,
            epic: 30,
          },
          itemCounts: itemCounts,
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
      const result = await this.aiDealerAgentService.handlePlayerMessage(
        body.walletAddress,
        body.message,
      );
      if (result.outcome && result.outcome === 'accepted') {
        const data = await this.aiDealerAgentService.getAgentFarmData(
          body.walletAddress,
        );
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
      const data = await this.aiDealerAgentService.getAgentFarmData(
        body.walletAddress,
      );
      if (!data || !data.isFarming) {
        console.log("Can't find agent farm data or farming not started yet");
        return { message: 'Agent farm data not found or farming not started' };
      }
      await this.aiDealerAgentService.updateAgentFarmData(body.walletAddress, {
        isFarming: false,
        startTime: 0,
        duration: 0,
        itemCounts: null,
      });
      this.aiDealerAgentService.stopAgent();
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
      return await this.aiDealerAgentService.createAgentFarmData(
        createAgentFarmDto,
      );
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
      const data =
        await this.aiDealerAgentService.getAgentFarmData(walletAddress);
      if (!data) {
        const data = await this.aiDealerAgentService.createAgentFarmData({
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
      const data = await this.aiDealerAgentService.updateAgentFarmData(
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
      const data =
        await this.aiDealerAgentService.deleteAgentFarmData(walletAddress);
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

  @Delete('closeChat/:walletAddress')
  @ApiOperation({ summary: 'Delete chat history for a user' })
  @ApiParam({
    name: 'walletAddress',
    description: 'Wallet address of the user',
  })
  async deleteChatHistory(
    @Param('walletAddress') walletAddress: string,
  ): Promise<any> {
    try {
      const result =
        await this.chatHistoryService.clearChatHistory(walletAddress);
      return result;
    } catch (error) {
      console.error('Error deleting chat history:', error);
      throw new HttpException(
        'An error occurred while processing your request',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('/feedbackGame')
  @ApiOperation({ summary: 'Chat with the agent' })
  async storeUserFeedback(@Body() body: FeedbackDto) {
    try {
      await this.aiFeedBackService.initializeAiFeedbackAgent(
        ` ${body.walletAddress}-feedback`,
      );
    } catch (error) {
      throw new HttpException('Store FeedBack Error ', 500);
    }
  }
}
