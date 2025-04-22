import { Controller, Get, Post, Body } from '@nestjs/common';
import { ShopService } from './shop.service';

@Controller('api')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get('getShopData')
  async getShopData() {
    return this.shopService.getShopData();
  }

  @Post('uploadShopData')
  async uploadShopData(@Body() shopData: any) {
    return this.shopService.uploadShopData(shopData);
  }

  @Post('uploadShopFile')
  async uploadShopFile(@Body() body: { fileContent: string }) {
    return this.shopService.uploadShopFile(body.fileContent);
  }
}
