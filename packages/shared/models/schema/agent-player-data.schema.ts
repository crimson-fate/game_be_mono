import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AgentPlayerDataDocument = AgentPlayerData & Document;

@Schema()
export class AgentPlayerData {
  @Prop({ required: true, unique: true })
  walletAddress: string;

  @Prop({ required: true, default: false })
  isFarming: boolean;

  @Prop({ required: true, default: new Date().getTime() })
  startTime: number;

  @Prop({ required: true, default: 0 })
  duration: number;

  @Prop({ type: Object, required: true, default: {} })
  itemCounts: {
    common: number;
    great: number;
    rare: number;
    epic: number;
  };
}

export const AgentPlayerDataSchema =
  SchemaFactory.createForClass(AgentPlayerData);
