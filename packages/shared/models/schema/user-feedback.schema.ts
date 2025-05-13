import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export enum FEEDBACK_CATEGORY {
  BUG = 'bug',
  FeatureRequest = 'feature_request',
  Compliment = 'compliment',
  Question = 'question',
  Other = 'other',
}

@Schema({
  timestamps: true,
})
export class UserFeedbackData {
  @Prop({ required: true, unique: true })
  walletAddress: string;

  @Prop({
    type: Array,
  })
  feedback: string[];

  @Prop({
    enum: FEEDBACK_CATEGORY,
  })
  aiCategory: FEEDBACK_CATEGORY;

  @Prop({
    type: Number,
    min: 1,
    max: 10,
  })
  aiScore: number;
}
export const UserFeedbackDataSchema =
  SchemaFactory.createForClass(UserFeedbackData);
