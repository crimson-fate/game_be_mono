import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type InventoryUserDocument = InventoryUser & Document;

@Schema()
export class InventoryUser {
  @Prop({ required: true, unique: true })
  walletAddress: string;

  @Prop({ type: Object, required: true })
  inventory: {
    items: Array<{
      itemId: string;
      quantity: number;
      type: string;
    }>;
    equipment: Array<{
      itemId: string;
      level: number;
      type: string;
    }>;
    resources?: {
      gold: number;
    };
  };

  @Prop({ type: Object, required: true })
  stats: {
    totalItems: number;
    totalEquipment: number;
  };
}

export const InventoryUserSchema = SchemaFactory.createForClass(InventoryUser); 