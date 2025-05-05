import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { UpdatePlayerResourceDto } from './dto/update-player-resource';
import {
  PlayerResource,
  PlayerResourceDocument,
} from '@app/shared/models/schema/player-resource.schema';
import { Model } from 'mongoose';
export class PlayerResourceService {
  constructor(
    @InjectModel(PlayerResource.name)
    private readonly playerResourceModel: Model<PlayerResourceDocument>,
  ) {}

  async getOrCreatePlayerResource(walletAddress: string) {
    try {
      const playerResource = await this.playerResourceModel.findOne({
        walletAddress,
      });

      if (playerResource) {
        return playerResource;
      }

      const newPlayerResource = new this.playerResourceModel({
        walletAddress,
        dicCommonResource: {},
        dicSoulPieceResource: {},
      });

      return await newPlayerResource.save();
    } catch (error) {
      console.error('Error in getOrCreatePlayerResource:', error);
      throw new InternalServerErrorException(
        'Failed to get or create player resource',
      );
    }
  }

  async updatePlayerResource(
    walletAddress: string,
    updateDto: UpdatePlayerResourceDto,
  ) {
    const existing = await this.playerResourceModel.findOne({ walletAddress });
    if (!existing) {
      throw new NotFoundException('Player resource not found');
    }

    const updateObject: any = {};

    if (updateDto.dicCommonResource) {
      for (const key in updateDto.dicCommonResource) {
        updateObject[`dicCommonResource.${key}`] =
          updateDto.dicCommonResource[key];
      }
    }

    if (updateDto.dicSoulPieceResource) {
      for (const key in updateDto.dicSoulPieceResource) {
        updateObject[`dicSoulPieceResource.${key}`] =
          updateDto.dicSoulPieceResource[key];
      }
    }

    const updated = await this.playerResourceModel
      .findOneAndUpdate(
        { walletAddress },
        { $set: updateObject },
        { new: true },
      )
      .exec();

    return updated;
  }
}
