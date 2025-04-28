import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Players } from '@app/shared/models/schema/player.schema';
import {
  formattedContractAddress,
  unformattedContractAddress,
} from '@app/shared/utils/formatAddress';
import { lookupAddresses } from '@cartridge/controller';

@Injectable()
export class PlayersService {
  constructor(
    @InjectModel(Players.name)
    private readonly playerModel: Model<Players>,
  ) {}

  async getOrCreeatePlayer(walletAddress: string) {
    const formattedAddress = formattedContractAddress(walletAddress);
    let player = await this.playerModel.findOne({
      address: formattedAddress,
    });

    if (!player) {
      const unformattedAddress = unformattedContractAddress(formattedAddress);
      const addressesMap = await lookupAddresses([unformattedAddress]);
      const username = addressesMap.get(unformattedAddress);

      const newPlayer = new this.playerModel({
        address: formattedAddress,
        username: username ? username : null,
      });

      player = await newPlayer.save();
    }

    return player;
  }
}
