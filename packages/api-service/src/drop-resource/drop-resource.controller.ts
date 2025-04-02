import { Controller, Get, Post, Body } from '@nestjs/common';
import { DropResourceService } from './drop-resource.service';

@Controller('api')
export class DropResourceController {
  constructor(private readonly dropResourceService: DropResourceService) {}

  @Get('getDropResourceData')
  async getDropResourceData() {
    return this.dropResourceService.getDropResourceData();
  }

  @Post('uploadDropResourceData')
  async uploadDropResourceData(@Body() dropResourceData: any) {
    return this.dropResourceService.uploadDropResourceData(dropResourceData);
  }

  @Post('uploadDropResourceFile')
  async uploadDropResourceFile(@Body() body: { fileContent: string }) {
    return this.dropResourceService.uploadDropResourceFile(body.fileContent);
  }
}
