import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Shop } from '../../../shared/models/schema/shop.schema';

@Injectable()
export class ShopService {
  constructor(
    @InjectModel(Shop.name) private readonly shopModel: Model<Shop>,
  ) {}

  async getShopData() {
    try {
      const shops = await this.shopModel.find().lean().exec();
      if (shops.length === 0) {
        return {
          success: false,
          message: 'No shop data found',
        };
      }

      // Lấy dữ liệu đầu tiên vì chúng ta chỉ lưu một bản ghi
      const { _id, __v, ...shopData } = shops[0];

      return {
        success: true,
        message: 'Shop data retrieved successfully',
        data: shopData,
      };
    } catch (error) {
      console.error('Error getting shop data:', error);
      throw error;
    }
  }

  async uploadShopFile(fileContent: string) {
    try {
      const shopData = JSON.parse(fileContent);
      return this.uploadShopData(shopData);
    } catch (error) {
      return {
        success: false,
        message: `Error processing shop file: ${error.message}`,
      };
    }
  }

  async uploadShopData(shopData: any) {
    try {
      // Xóa dữ liệu cũ
      await this.shopModel.deleteMany({});

      const dataToSave = {
        dicCostChest: shopData.dicCostChest || {},
        dicCostKey: shopData.dicCostKey || {},
        dicRateSilverChest: shopData.dicRateSilverChest || {},
        dicRateGoldenChest: shopData.dicRateGoldenChest || {},
        dicMaterialChestReward: shopData.dicMaterialChestReward || {},
        dicShopCoinValue: shopData.dicShopCoinValue || {},
        dicShopCoinCost: shopData.dicShopCoinCost || {},
        dicShopCashPackID: shopData.dicShopCashPackID || {},
        dicRateSalePercent: shopData.dicRateSalePercent || {},
        dicShopDailyCoin: shopData.dicShopDailyCoin || [],
        dicShopDailyCash: shopData.dicShopDailyCash || [],
        dicShopDailyAds: shopData.dicShopDailyAds || [],
        updatedAt: shopData.updatedAt || new Date().toISOString(),
      };

      const createdShop = await this.shopModel.create(dataToSave);
      return {
        success: true,
        message: 'Shop data imported successfully',
        data: createdShop,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error importing shop data: ${error.message}`,
        error: error,
      };
    }
  }
}
