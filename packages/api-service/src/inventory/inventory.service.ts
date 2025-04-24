import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CreateGameInventoryDto, UpdateGameInventoryDto, GetGameInventoryDto } from './dto/inventory.dto';
import { InventoryUser, InventoryUserDocument } from '@app/shared/models/schema/inventory-user.schema';

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(InventoryUser.name)
    private inventoryModel: Model<InventoryUserDocument>,
  ) {}

  async create(dto: CreateGameInventoryDto): Promise<InventoryUser> {
    const inventory = new this.inventoryModel({
      walletAddress: dto.walletAddress,
      inventory: dto.inventory,
      stats: {
        totalEquipment: dto.inventory ? dto.inventory.lstOwned.length : 0,
        lastUpdated: new Date(),
      },
    });

    return inventory.save();
  }

  async get(dto: GetGameInventoryDto): Promise<InventoryUser> {
    const inventory = await this.inventoryModel.findOne({ walletAddress: dto.walletAddress });
    if (!inventory) {
      throw new NotFoundException('Inventory not found');
    }
    return inventory;
  }

  async update(dto: UpdateGameInventoryDto): Promise<InventoryUser> {
    const inventory = await this.inventoryModel.findOneAndUpdate(
      { walletAddress: dto.walletAddress },
      {
        $set: {
          inventory: dto.inventory,
          stats: {
            totalEquipment: dto.inventory ? dto.inventory.lstOwned.length : 0,
          },
        },
      },
      { new: true, upsert: true },
    );

    return inventory;
  }

  async delete(dto: GetGameInventoryDto): Promise<void> {
    const result = await this.inventoryModel.deleteOne({ walletAddress: dto.walletAddress });
    if (result.deletedCount === 0) {
      throw new NotFoundException('Inventory not found');
    }
  }
} 