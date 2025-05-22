import { EventEmitter } from 'events';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable, Logger } from '@nestjs/common';
import {
  FEEDBACK_CATEGORY,
  UserFeedbackData,
} from '@app/shared/models/schema/user-feedback.schema';
import { Model } from 'mongoose';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    @InjectModel(UserFeedbackData.name)
    private readonly userFeedbackDataModel: Model<UserFeedbackData>,
  ) {}

  public async store(
    walletAddress: string,
    feedbackMessage: string, // The raw feedback string from the user
    categoryForLatest: FEEDBACK_CATEGORY,
    scoreForLatest: number,
  ): Promise<void> {
    this.logger.log(
      `Storing feedback for ${walletAddress}: [Category: ${categoryForLatest}, Score: ${scoreForLatest}] "${feedbackMessage}"`,
    );
    try {
      await this.userFeedbackDataModel.findOneAndUpdate(
        { walletAddress: walletAddress },
        {
          $push: { feedback: feedbackMessage }, // Push the raw string into the array
          $set: {
            aiCategory: categoryForLatest, // Set the category for the latest feedback
            aiScore: scoreForLatest, // Set the score for the latest feedback
            // updatedAt: new Date() // Mongoose timestamps: true should handle this
          },
        },
        { upsert: true, new: true },
      );
      this.logger.log(
        `Feedback for ${walletAddress} stored/updated successfully.`,
      );
    } catch (error) {
      this.logger.error(
        `Error storing/updating feedback for ${walletAddress}: ${error.message}`,
        error.stack,
      );
      throw new Error(
        `Failed to store/update feedback in database for ${walletAddress}.`,
      );
    }
  }
}
