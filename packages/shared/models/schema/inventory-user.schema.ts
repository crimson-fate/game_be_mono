import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type InventoryUserDocument = InventoryUser & Document;

@Schema()
export class InventoryUser {
  @Prop({ required: true, unique: true })
  walletAddress: string;

  @Prop({ type: Object, required: true, default: {} })
  inventory: {
    sortByType: boolean;
    lstOwned: Array<{
      randomSkill: boolean;
      randomAttribute: boolean;
      equipemntID: string;
      currrentRarity: number;
      baseAttribute: number;
      skillLink: number;
      currentUpradeLevel: number;
      isNewEquipment: boolean;
      lstSubAttributeKey: string[];
      resourceValue: number;
    }>;
    dicEquippedKey: Record<string, string>;
  };

  @Prop({ type: Object, required: true, default: {} })
  stats: {
    totalEquipment: number;
    lastUpdated: Date;
  };
}

export const InventoryUserSchema = SchemaFactory.createForClass(InventoryUser);
