import { Controller, Get, Post, Body } from '@nestjs/common';
import { PlayerLevelService } from './player-level.service';

@Controller('api')
export class PlayerLevelController {
  constructor(private readonly playerLevelService: PlayerLevelService) {}

  @Get('getPlayerLevelData')
  async getPlayerLevelData() {
    return this.playerLevelService.getPlayerLevelData();
  }

  @Post('uploadPlayerLevelData')
  async uploadPlayerLevelData(@Body() playerLevelData: any) {
    return this.playerLevelService.uploadPlayerLevelData(playerLevelData);
  }

  @Post('uploadPlayerLevelFile')
  async uploadPlayerLevelFile(@Body() body: { fileContent: string }) {
    return this.playerLevelService.uploadPlayerLevelFile(body.fileContent);
  }
} 