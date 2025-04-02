import { Controller, Get, Post, Body } from '@nestjs/common';
import { ZoneService } from './zone.service';

@Controller('api')
export class ZoneController {
  constructor(private readonly zoneService: ZoneService) {}

  @Get('getZoneData')
  async getZoneData() {
    return this.zoneService.getZoneData();
  }

  @Post('uploadZoneData')
  async uploadZoneData(@Body() zoneData: any) {
    return this.zoneService.uploadZoneData(zoneData);
  }

  @Post('uploadZoneFile')
  async uploadZoneFile(@Body() body: { fileContent: string }) {
    return this.zoneService.uploadZoneFile(body.fileContent);
  }
} 