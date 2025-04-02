import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Shop extends Document {
  @Prop({ type: Object, required: true })
  dicCostChest: Record<string, any>;

  @Prop({ type: Object, required: true })
  dicCostKey: Record<string, any>;

  @Prop({ type: Object, required: true })
  dicRateSilverChest: Record<string, any>;

  @Prop({ type: Object, required: true })
  dicRateGoldenChest: Record<string, any>;

  @Prop({ type: Object, required: true })
  dicMaterialChestReward: Record<string, any>;

  @Prop({ type: Object, required: true })
  dicShopCoinValue: Record<string, any>;

  @Prop({ type: Object, required: true })
  dicShopCoinCost: Record<string, any>;

  @Prop({ type: Object, required: true })
  dicShopCashPackID: Record<string, any>;

  @Prop({ type: Object, required: true })
  dicRateSalePercent: Record<string, any>;

  @Prop({ type: Array, required: true })
  dicShopDailyCoin: any[];

  @Prop({ type: Array, required: true })
  dicShopDailyCash: any[];

  @Prop({ type: Array, required: true })
  dicShopDailyAds: any[];

  @Prop({ required: true })
  updatedAt: string;
}

export const ShopSchema = SchemaFactory.createForClass(Shop);
