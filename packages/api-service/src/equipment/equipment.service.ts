import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Equipment,
  EquipmentDocument,
} from '@app/shared/models/schema/equipment.schema';

@Injectable()
export class EquipmentService {
  private readonly logger = new Logger(EquipmentService.name);

  constructor(
    @InjectModel(Equipment.name)
    private equipmentModel: Model<EquipmentDocument>,
  ) {}

  async getEquipmentData() {
    try {
      const data = await this.equipmentModel.findOne().lean();
      if (!data) {
        return {
          success: false,
          message: 'No equipment data found',
          data: {
            lstSkillVip: [],
            dicStatsCapital: {},
            dicUpradeConfig: {},
            dicMaxLevelUpgrade: {},
            lstEquipmentSetConfig: [],
            offsetMulti: 0,
            maxParterm: 0,
            updatedAt: new Date().toISOString(),
          },
        };
      }
      const { _id, __v, ...equipmentData } = data;
      return {
        success: true,
        message: 'Equipment data retrieved successfully',
        data: equipmentData,
      };
    } catch (error) {
      this.logger.error('Error getting equipment data:', error);
      return {
        success: false,
        message: 'Error retrieving equipment data',
        error: error.message,
      };
    }
  }

  async uploadEquipmentFile(fileContent: string) {
    try {
      const jsonData = JSON.parse(fileContent);
      await this.equipmentModel.deleteMany({});

      // Lưu trực tiếp dữ liệu từ file JSON
      const newEquipment = new this.equipmentModel({
        ...jsonData,
        updatedAt: new Date().toISOString(),
      });

      await newEquipment.save();

      // Lấy dữ liệu vừa lưu để trả về
      const savedData = await this.equipmentModel.findOne().lean();
      const { _id, __v, ...equipmentData } = savedData;

      return {
        success: true,
        message: 'Equipment data uploaded successfully',
        data: equipmentData,
      };
    } catch (error) {
      this.logger.error('Error uploading equipment data:', error);
      return {
        success: false,
        message: 'Error uploading equipment data',
        error: error.message,
      };
    }
  }
}
