import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DungeonService } from './dungeon.service';
import { walletAddressDto } from './dto/WalletAddress.dto';
import { CompleteWaveDto } from './dto/CompleteWave.dto';
import { SeasonIdDto } from './dto/SeasonId.dto';
import { BaseResult } from '@app/shared/utils/types';

@Controller('dungeon')
@ApiTags('Dungeon')
export class DungeonController {
  constructor(private readonly dungeonService: DungeonService) {}

  @Get('current-season')
  @ApiOperation({ summary: 'Get current season' })
  @ApiResponse({
    status: 200,
    description: 'Current season fetched successfully',
  })
  async getCurrentSeason() {
    const result = await this.dungeonService.getCurrentSeason();
    return new BaseResult(result);
  }

  @Post('start-new-game')
  @ApiOperation({ summary: 'Start new game' })
  @ApiResponse({ status: 200, description: 'New game started successfully' })
  async startNewGame(@Body() dto: walletAddressDto) {
    const result = await this.dungeonService.startNewGame(dto);
    return new BaseResult(result);
  }

  @Get('current-game')
  @ApiOperation({ summary: 'Get current game' })
  @ApiResponse({
    status: 200,
    description: 'Current game fetched successfully',
  })
  async getCurrentGame(@Query() query: walletAddressDto) {
    const result = await this.dungeonService.getCurrentGame(query);
    return new BaseResult(result);
  }

  @Post('complete-wave')
  @ApiOperation({ summary: 'Complete wave' })
  @ApiResponse({ status: 200, description: 'Wave completed successfully' })
  async completeWave(@Body() dto: CompleteWaveDto) {
    const result = await this.dungeonService.completeWave(dto);
    return new BaseResult(result);
  }

  @Post('end-wave')
  @ApiOperation({ summary: 'End wave' })
  @ApiResponse({ status: 200, description: 'Wave ended successfully' })
  async endWave(@Body() dto: CompleteWaveDto) {
    const result = await this.dungeonService.endWave(dto);
    return new BaseResult(result);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get leaderboard' })
  @ApiResponse({ status: 200, description: 'Leaderboard fetched successfully' })
  async getLeaderboard(@Query() query: SeasonIdDto) {
    const result = await this.dungeonService.getLeaderboard(query);
    return new BaseResult(result);
  }
}
