import { ApiTags } from '@nestjs/swagger';
import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { PlayerResourceService } from './player-resource.service';
import { UpdatePlayerResourceDto } from './dto/update-player-resource';

@Controller('playerResource')
@ApiTags('Player Resource')
export class PlayerResourceController {
  constructor(private readonly playerResourceService: PlayerResourceService) {}

  @Get('/:walletAddress')
  async getPlayerResource(@Param('walletAddress') walletAddress: string) {
    return await this.playerResourceService.getOrCreatePlayerResource(
      walletAddress,
    );
  }

  @Put('/:walletAddress')
  async updatePlayerResource(
    @Param('walletAddress') walletAddress: string,
    @Body() playerResource: UpdatePlayerResourceDto,
  ) {
    return await this.playerResourceService.updatePlayerResource(
      walletAddress,
      playerResource,
    );
  }
}
