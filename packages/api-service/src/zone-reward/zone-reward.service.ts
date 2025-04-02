import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ZoneReward,
  ZoneRewardDocument,
} from '@app/shared/models/schema/zone-reward.schema';

@Injectable()
export class ZoneRewardService {
  private readonly logger = new Logger(ZoneRewardService.name);

  constructor(
    @InjectModel(ZoneReward.name)
    private zoneRewardModel: Model<ZoneRewardDocument>,
  ) {}

  async getZoneRewardData() {
    try {
      const data = await this.zoneRewardModel.findOne().lean();
      if (!data) {
        return {
          success: false,
          message: 'No zone reward data found',
          data: {
            lstZoneRewardConfigCampaign: [],
            lstZoneRewardConfigInferno: [],
            updatedAt: new Date().toISOString(),
          },
        };
      }
      const { _id, __v, ...zoneRewardData } = data;
      return {
        success: true,
        message: 'Zone reward data retrieved successfully',
        data: zoneRewardData,
      };
    } catch (error) {
      this.logger.error('Error getting zone reward data:', error);
      return {
        success: false,
        message: 'Error retrieving zone reward data',
        error: error.message,
      };
    }
  }

  async uploadZoneRewardFile(fileContent: string) {
    try {
      const jsonData = JSON.parse(fileContent);

      // Đảm bảo dữ liệu có định dạng đúng
      const formattedData = {
        lstZoneRewardConfigCampaign: jsonData.lstZoneRewardConfigCampaign || [],
        lstZoneRewardConfigInferno: jsonData.lstZoneRewardConfigInferno || [],
        updatedAt: jsonData.updatedAt || new Date().toISOString(),
      };

      // Xóa dữ liệu cũ
      await this.zoneRewardModel.deleteMany({});

      // Tạo và lưu dữ liệu mới
      const newZoneReward = new this.zoneRewardModel(formattedData);
      await newZoneReward.save();

      const savedData = await this.zoneRewardModel.findOne().lean();
      const { _id, __v, ...zoneRewardData } = savedData;

      return {
        success: true,
        message: 'Zone reward data uploaded successfully',
        data: zoneRewardData,
      };
    } catch (error) {
      this.logger.error('Error uploading zone reward data:', error);
      return {
        success: false,
        message: 'Error uploading zone reward data',
        error: error.message,
      };
    }
  }
}
