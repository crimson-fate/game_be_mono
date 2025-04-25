import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DungeonService } from './dungeon.service';
import { walletAddressDto } from './dto/WalletAddress.dto';
import { CompleteWaveDto } from './dto/CompleteWave.dto';
import { SeasonIdDto } from './dto/SeasonId.dto';

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
    return this.dungeonService.getCurrentSeason();
  }

  @Post('start-new-game')
  @ApiOperation({ summary: 'Start new game' })
  @ApiResponse({ status: 200, description: 'New game started successfully' })
  async startNewGame(@Body() dto: walletAddressDto) {
    return this.dungeonService.startNewGame(dto);
  }

  @Post('complete-wave')
  @ApiOperation({ summary: 'Complete wave' })
  @ApiResponse({ status: 200, description: 'Wave completed successfully' })
  async completeWave(@Body() dto: CompleteWaveDto) {
    return this.dungeonService.completeWave(dto);
  }

  @Post('end-wave')
  @ApiOperation({ summary: 'End wave' })
  @ApiResponse({ status: 200, description: 'Wave ended successfully' })
  async endWave(@Body() dto: CompleteWaveDto) {
    return this.dungeonService.endWave(dto);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get leaderboard' })
  @ApiResponse({ status: 200, description: 'Leaderboard fetched successfully' })
  async getLeaderboard(@Query() query: SeasonIdDto) {
    return this.dungeonService.getLeaderboard(query);
  }
}
