import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Hero extends Document {
  @Prop({ required: true })
  lstHero: any[];

  @Prop({ required: true })
  lstUpgradeConfig: any[];

  @Prop({ required: true })
  maxHeroEditor: number;

  @Prop({ required: true })
  maxHeroLevel: number;

  @Prop({ required: true })
  updatedAt: string;
}

export const HeroSchema = SchemaFactory.createForClass(Hero);
