import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
@Schema({ _id: false })
export class CommonResource {
  @Prop({ default: 0 }) Coin: number;
  @Prop({ default: 0 }) Cash: number;
  @Prop({ default: 0 }) Energy: number;
  @Prop({ default: 0 }) Exp: number;
  @Prop({ default: 0 }) HeroPiece: number;
  @Prop({ default: 0 }) Revival: number;
  @Prop({ default: 0 }) Silver_Key: number;
  @Prop({ default: 0 }) Golden_Key: number;
  @Prop({ default: 0 }) Forge_Hamer: number;
  @Prop({ default: 0 }) Daily_Active_Point: number;
  @Prop({ default: 0 }) Weekly_Active_Point: number;
  @Prop({ default: 0 }) Achivement_Point: number;
  @Prop({ default: 0 }) Coin_Time_Reward: number;
  @Prop({ default: 0 }) AgentActivator: number;
}

@Schema({ _id: false })
export class SoulPieceResource {
  @Prop({ default: 0 }) Mechanic_Soul: number;
  @Prop({ default: 0 }) Fire_Soul: number;
  @Prop({ default: 0 }) Lightning_Soul: number;
  @Prop({ default: 0 }) Mythic_Soul: number;
  @Prop({ default: 0 }) Pollute_Soul: number;
}
export type PlayerResourceDocument = PlayerResource & Document;
@Schema()
export class PlayerResource extends Document {
  @Prop({ required: true, unique: true })
  walletAddress: string;

  @Prop({ type: CommonResource, required: true })
  dicCommonResource: CommonResource;

  @Prop({ type: SoulPieceResource, required: true })
  dicSoulPieceResource: SoulPieceResource;
}

export const PlayerResourceSchema =
  SchemaFactory.createForClass(PlayerResource);
