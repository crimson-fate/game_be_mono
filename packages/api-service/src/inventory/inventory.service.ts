import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CreateInventoryDto, UpdateInventoryDto, GetInventoryDto } from './dto/inventory.dto';
import { InventoryUser, InventoryUserDocument } from '@app/shared/models/schema/inventory-user.schema';

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(InventoryUser.name)
    private inventoryModel: Model<InventoryUserDocument>,
  ) {}

  async create(dto: CreateInventoryDto): Promise<InventoryUser> {
    const inventory = new this.inventoryModel({
      walletAddress: dto.walletAddress,
      inventory: dto.inventory,
      stats: {
        totalItems: dto.inventory.items.length,
        totalEquipment: dto.inventory.equipment.length,
        lastUpdated: new Date(),
      },
    });

    return inventory.save();
  }

  async get(dto: GetInventoryDto): Promise<InventoryUser> {
    const inventory = await this.inventoryModel.findOne({ walletAddress: dto.walletAddress });
    if (!inventory) {
      throw new NotFoundException('Inventory not found');
    }
    return inventory;
  }

  async update(dto: UpdateInventoryDto): Promise<InventoryUser> {
    const inventory = await this.inventoryModel.findOneAndUpdate(
      { walletAddress: dto.walletAddress },
      {
        $set: {
          inventory: dto.inventory,
          stats: {
            totalItems: dto.inventory.items.length,
            totalEquipment: dto.inventory.equipment.length,
            lastUpdated: new Date(),
          },
        },
      },
      { new: true, upsert: true },
    );

    return inventory;
  }

  async delete(dto: GetInventoryDto): Promise<void> {
    const result = await this.inventoryModel.deleteOne({ walletAddress: dto.walletAddress });
    if (result.deletedCount === 0) {
      throw new NotFoundException('Inventory not found');
    }
  }
} 