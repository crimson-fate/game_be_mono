import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PlayerLevel } from '../../../shared/models/schema/player-level.schema';

@Injectable()
export class PlayerLevelService {
  constructor(
    @InjectModel(PlayerLevel.name)
    private readonly playerLevelModel: Model<PlayerLevel>,
  ) {}

  async getPlayerLevelData() {
    try {
      const playerLevels = await this.playerLevelModel.find().lean().exec();
      if (playerLevels.length === 0) {
        return {
          success: false,
          message: 'No player level data found',
        };
      }

      // Lấy dữ liệu đầu tiên vì chúng ta chỉ lưu một bản ghi
      const { _id, __v, ...playerLevelData } = playerLevels[0];

      return {
        success: true,
        message: 'Player level data retrieved successfully',
        data: playerLevelData,
      };
    } catch (error) {
      console.error('Error getting player level data:', error);
      throw error;
    }
  }

  async uploadPlayerLevelFile(fileContent: string) {
    try {
      const playerLevelData = JSON.parse(fileContent);
      return this.uploadPlayerLevelData(playerLevelData);
    } catch (error) {
      return {
        success: false,
        message: `Error processing player level file: ${error.message}`,
      };
    }
  }

  async uploadPlayerLevelData(playerLevelData: any) {
    try {
      // Xóa dữ liệu cũ
      await this.playerLevelModel.deleteMany({});

      const dataToSave = {
        startEnergyCapital: playerLevelData.startEnergyCapital || 20,
        maxMaxEnergyCapital: playerLevelData.maxMaxEnergyCapital || 60,
        levelUpCashBonus: playerLevelData.levelUpCashBonus || 10,
        leveUpEnergyBonus: playerLevelData.leveUpEnergyBonus || 10,
        levelUpEnergyCapitalBonus:
          playerLevelData.levelUpEnergyCapitalBonus || 2,
        timeRecoverEnergy: playerLevelData.timeRecoverEnergy || 5,
        lstLevelExp: playerLevelData.lstLevelExp || [],
        updatedAt: playerLevelData.updatedAt || new Date().toISOString(),
      };

      const createdPlayerLevel = await this.playerLevelModel.create(dataToSave);
      return {
        success: true,
        message: 'Player level data imported successfully',
        data: createdPlayerLevel,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error importing player level data: ${error.message}`,
        error: error,
      };
    }
  }
}
