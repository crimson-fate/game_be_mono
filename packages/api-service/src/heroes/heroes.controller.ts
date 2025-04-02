import { Controller, Get, Post, Body } from '@nestjs/common';
import { HeroesService } from './heroes.service';

@Controller('api')
export class HeroesController {
  constructor(private readonly heroesService: HeroesService) {}

  @Post('uploadHeroData')
  async uploadHeroData(@Body() heroData: any) {
    return this.heroesService.uploadHeroData(heroData);
  }

  @Get('getHeroData')
  async getHeroData() {
    return this.heroesService.getAllHeroes();
  }

  @Post('uploadHeroFile')
  async uploadHeroFile(@Body() body: { fileContent: string }) {
    return this.heroesService.uploadHeroFile(body.fileContent);
  }
} 