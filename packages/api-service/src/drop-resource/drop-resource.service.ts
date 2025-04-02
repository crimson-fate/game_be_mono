/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DropResource } from '@app/shared/models/schema/drop-resource.schema';

@Injectable()
export class DropResourceService {
  constructor(
    @InjectModel(DropResource.name)
    private readonly dropResourceModel: Model<DropResource>,
  ) {}

  async getDropResourceData() {
    try {
      const dropResources = await this.dropResourceModel.find().lean().exec();
      if (dropResources.length === 0) {
        return {
          success: false,
          message: 'No drop resource data found',
        };
      }

      // Lấy dữ liệu đầu tiên vì chúng ta chỉ lưu một bản ghi
      const { _id, __v, ...dropResourceData } = dropResources[0];

      return {
        success: true,
        message: 'Drop resource data retrieved successfully',
        data: dropResourceData,
      };
    } catch (error) {
      console.error('Error getting drop resource data:', error);
      throw error;
    }
  }

  async uploadDropResourceFile(fileContent: string) {
    try {
      const dropResourceData = JSON.parse(fileContent);
      return this.uploadDropResourceData(dropResourceData);
    } catch (error) {
      return {
        success: false,
        message: `Error processing drop resource file: ${error.message}`,
      };
    }
  }

  async uploadDropResourceData(dropResourceData: any) {
    try {
      // Xóa dữ liệu cũ
      await this.dropResourceModel.deleteMany({});

      const dataToSave = {
        lstZoneResourceConfigsCampaign:
          dropResourceData.lstZoneResourceConfigsCampaign || [],
        dicRateDropByLevel: dropResourceData.dicRateDropByLevel || {},
        dicRateExpByLevel: dropResourceData.dicRateExpByLevel || {},
        dicRateDropByType: dropResourceData.dicRateDropByType || {},
        dicRateExpByType: dropResourceData.dicRateExpByType || {},
        updatedAt: dropResourceData.updatedAt || new Date().toISOString(),
      };

      const createdDropResource =
        await this.dropResourceModel.create(dataToSave);
      return {
        success: true,
        message: 'Drop resource data imported successfully',
        data: createdDropResource,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error importing drop resource data: ${error.message}`,
        error: error,
      };
    }
  }
}
