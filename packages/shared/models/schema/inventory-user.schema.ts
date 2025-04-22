import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type InventoryUserDocument = InventoryUser & Document;

@Schema({ timestamps: true })
export class InventoryUser {
  @Prop({ required: true, index: true, unique: true })
  walletAddress: string;

  @Prop({ type: Object, required: true, default: {} })
  inventory: {
    items: Array<{
      itemId: string;
      quantity: number;
      metadata?: Record<string, any>;
    }>;
    equipment: Array<{
      equipmentId: string;
      level: number;
      stats: Record<string, number>;
      metadata?: Record<string, any>;
    }>;
    resources: Record<string, number>;
  };

  @Prop({ type: Object, required: true, default: {} })
  stats: {
    totalItems: number;
    totalEquipment: number;
    lastUpdated: Date;
  };

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const InventoryUserSchema = SchemaFactory.createForClass(InventoryUser); 