import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Zone } from '../../../shared/models/schema/zone.schema';

@Injectable()
export class ZoneService {
  constructor(
    @InjectModel(Zone.name) private readonly zoneModel: Model<Zone>,
  ) {}

  async getZoneData() {
    try {
      const zones = await this.zoneModel.find().lean().exec();
      if (zones.length === 0) {
        return {
          success: false,
          message: 'No zone data found',
        };
      }

      // Lấy dữ liệu đầu tiên vì chúng ta chỉ lưu một bản ghi
      const { _id, __v, ...zoneData } = zones[0];

      return {
        success: true,
        message: 'Zone data retrieved successfully',
        data: zoneData,
      };
    } catch (error) {
      console.error('Error getting zone data:', error);
      throw error;
    }
  }

  async uploadZoneFile(fileContent: string) {
    try {
      const zoneData = JSON.parse(fileContent);
      return this.uploadZoneData(zoneData);
    } catch (error) {
      return {
        success: false,
        message: `Error processing zone file: ${error.message}`,
      };
    }
  }

  async uploadZoneData(zoneData: any) {
    try {
      // Xóa dữ liệu cũ
      await this.zoneModel.deleteMany({});

      const dataToSave = {
        lstZone: zoneData.lstZone || [],
        maxZoneEditor: zoneData.maxZoneEditor || 0,
        maxZoneLevel: zoneData.maxZoneLevel || 0,
        updatedAt: zoneData.updatedAt || new Date().toISOString(),
      };

      const createdZone = await this.zoneModel.create(dataToSave);
      return {
        success: true,
        message: 'Zone data imported successfully',
        data: createdZone,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error importing zone data: ${error.message}`,
        error: error,
      };
    }
  }
}
