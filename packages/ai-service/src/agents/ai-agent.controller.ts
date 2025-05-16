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
  Logger,
} from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { AiAgentService } from './ai-agent.service';
import {
  ChatDto,
  FeedbackDto,
  InitializeAgentDto,
  WalletDto,
} from './dto/chat.dto';
import { BoostAgentDto, CreateAgentFarmDto, UpdateAgentFarmDto } from './dto/agent-farm.dto';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { AiDealerAgentService } from './services/ai-dealer-agent.service';
import { ChatHistoryService } from './services/chat-history.service';
import { PlayerResource, PlayerResourceDocument } from '@app/shared/models/schema/player-resource.schema';

@ApiTags('AI Agent')
@Controller('ai')
export class AiAgentController {
  private readonly logger = new Logger(AiAgentController.name);
  constructor(
    private readonly aiAgentService: AiAgentService,
    private readonly aiDealerAgentService: AiDealerAgentService,
    private readonly chatHistoryService: ChatHistoryService,
    @InjectModel(PlayerResource.name)
    private readonly playerResourceModel: Model<PlayerResourceDocument>,
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
      const data = await this.aiDealerAgentService.getAgentFarmData(
        body.walletAddress,
      );
      const result = await this.aiAgentService.initialize(
        body.walletAddress,
        data ? data.isFarming : false,
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
      const data = await this.aiDealerAgentService.getAgentFarmData(
        body.walletAddress,
      );
      const result = await this.aiAgentService.handleMessage(
        body.walletAddress,
        body.message,
        data ? data.isFarming : false,
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
      const playerMoney = await this.playerResourceModel.findOne({
        walletAddress: body.walletAddress,
      });
      const result = await this.aiDealerAgentService.initialize(
        body.walletAddress,
        {
          baseValue: 50,
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
        playerMoney.dicCommonResource.Coin
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
      console.log('Running negotiation...');
      const playerMoney = await this.playerResourceModel.findOne({
        walletAddress: body.walletAddress,
      });
      const result = await this.aiDealerAgentService.handleMessage(
        body.walletAddress,
        body.message,
        playerMoney.dicCommonResource.Coin
      );
      if (result.outcome && result.outcome === 'accepted') {
        const data = await this.aiDealerAgentService.getAgentFarmData(
          body.walletAddress,
        );
        result.itemCounts = data.itemCounts;
        result.extractedOffer = result.extractedOffer;

        await this.aiDealerAgentService.updateAgentFarmData(body.walletAddress, {
          isFarming: false,
          startTime: 0,
          duration: 0,
          itemCounts: null,
        });
        await this.aiDealerAgentService.reset(body.walletAddress);
        await this.aiAgentService.reset(body.walletAddress);
      } else if (result.outcome && result.outcome === 'ended') {
        await this.aiDealerAgentService.updateAgentFarmData(body.walletAddress, {
          isFarming: false,
          startTime: 0,
          duration: 0,
          itemCounts: null,
        });
        await this.aiDealerAgentService.reset(body.walletAddress);
        await this.aiAgentService.reset(body.walletAddress);
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
  async endNegotiation(@Body() body: WalletDto): Promise<any> {
    try {
      console.log('Ending negotiation...');
      const data = await this.aiDealerAgentService.getAgentFarmData(
        body.walletAddress,
      );
      if (!data || !data.isFarming) {
        console.log("EndDealer: Can't find agent farm data or farming not started yet");
        return { message: 'EndDealer: Agent farm data not found or farming not started' };
      }
      await this.aiDealerAgentService.updateAgentFarmData(body.walletAddress, {
        isFarming: false,
        startTime: 0,
        duration: 0,
        itemCounts: null,
      });
      this.aiDealerAgentService.reset(body.walletAddress);
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

  @Put('farm/boost/:walletAddress')
  @ApiOperation({ summary: 'Boost agent farm data' })
  @ApiParam({
    name: 'walletAddress',
    description: 'Wallet address of the player',
  })
  @ApiResponse({
    status: 200,
    description: 'Agent farm data boosted successfully',
  })
  async boostAgent(
    @Param('walletAddress') walletAddress: string,
    @Body() updateAgentFarmDto: BoostAgentDto,
  ) {
    try {
      const data = await this.aiDealerAgentService.boostAgent(
        walletAddress,
        updateAgentFarmDto.duration,
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
}

