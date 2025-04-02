import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Hero } from '../../../shared/models/schema/hero.schema';

@Injectable()
export class HeroesService {
  constructor(
    @InjectModel(Hero.name) private readonly heroModel: Model<Hero>,
  ) {}

  async uploadHeroData(heroData: any): Promise<any> {
    try {
      // Xóa dữ liệu cũ
      await this.heroModel.deleteMany({});

      // Chuyển đổi dicHeroConfig thành lstHero
      const lstHero = Object.entries(heroData.dicHeroConfig).map(
        ([heroType, data]: [string, any]) => ({
          heroType,
          ...data,
        }),
      );

      // Thêm các trường bắt buộc nếu chưa có
      const dataToSave = {
        lstHero,
        lstUpgradeConfig: heroData.lstUpgradeConfig || [],
        updatedAt: heroData.updatedAt || new Date().toISOString(),
        maxHeroLevel: heroData.maxHeroLevel || lstHero.length,
        maxHeroEditor: heroData.maxHeroEditor || lstHero.length,
      };

      // Thêm dữ liệu mới
      const createdHero = await this.heroModel.create(dataToSave);
      return {
        success: true,
        message: 'Hero data imported successfully',
        data: createdHero,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error importing hero data: ${error.message}`,
        error: error,
      };
    }
  }

  async getAllHeroes(): Promise<any> {
    const heroes = await this.heroModel.find().exec();
    if (heroes.length === 0) {
      return {
        success: false,
        message: 'No hero data found',
      };
    }

    // Lấy dữ liệu đầu tiên vì chúng ta chỉ lưu một bản ghi
    const heroData = heroes[0];

    // Chuyển đổi lstHero thành dicHeroConfig
    const dicHeroConfig = {};
    heroData.lstHero.forEach((hero) => {
      const { heroType, ...rest } = hero;
      dicHeroConfig[heroType] = rest;
    });

    // Trả về theo định dạng JSON gốc
    return {
      success: true,
      message: 'Hero data retrieved successfully',
      data: {
        dicHeroConfig,
        lstUpgradeConfig: heroData.lstUpgradeConfig,
        updatedAt: heroData.updatedAt,
      },
    };
  }

  async uploadHeroFile(fileContent: string): Promise<any> {
    try {
      const heroData = JSON.parse(fileContent);
      return this.uploadHeroData(heroData);
    } catch (error) {
      return {
        success: false,
        message: `Error processing hero file: ${error.message}`,
      };
    }
  }
}
