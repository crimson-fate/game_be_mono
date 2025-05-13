import { Controller, Get, Post, Body } from '@nestjs/common';
import { ZoneRewardService } from './zone-reward.service';

@Controller('api')
export class ZoneRewardController {
  constructor(private readonly zoneRewardService: ZoneRewardService) {}

  @Get('getZoneRewardData')
  async getZoneRewardData() {
    return this.zoneRewardService.getZoneRewardData();
  }

  @Post('uploadZoneRewardFile')
  async uploadZoneRewardFile(@Body() body: { fileContent: string }) {
    return this.zoneRewardService.uploadZoneRewardFile(body.fileContent);
  }
}
