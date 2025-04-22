import { Controller, Get, Post, Body } from '@nestjs/common';
import { EquipmentService } from './equipment.service';

@Controller('api')
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Get('getEquipmentData')
  async getEquipmentData() {
    return this.equipmentService.getEquipmentData();
  }

  @Post('uploadEquipmentFile')
  async uploadEquipmentFile(@Body() body: { fileContent: string }) {
    return this.equipmentService.uploadEquipmentFile(body.fileContent);
  }
}
