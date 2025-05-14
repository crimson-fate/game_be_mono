import { EventEmitter } from 'events';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable, Logger } from '@nestjs/common';
import {
  FEEDBACK_CATEGORY,
  UserFeedbackData,
} from '@app/shared/models/schema/user-feedback.schema';
import { Model } from 'mongoose';
import { simpleUI } from '../simple-ui/simple-ui';
import {
  context,
  createDreams,
  createMemoryStore,
  createVectorStore,
  extension,
  input,
  LogLevel,
  output,
  render,
} from '@daydreamsai/core';
import { AiAgentConfigService } from 'ai-service/src/config/ai-agent.config';

import { z } from 'zod';
import { groq } from '@ai-sdk/groq';
simpleUI.initializeUI();
simpleUI.logMessage(
  LogLevel.INFO,
  'Starting UserFeedback Agent (Natural Language Mode)...',
);

interface FeedBackAgentState {
  agentId: string; // walletAddress of user
  lastPlayerMessage: string | null;
}
const playerInteractionEmitter = new EventEmitter();
@Injectable()
export class AiFeedbackService {
  private readonly logger = new Logger(AiFeedbackService.name);
  private agent;
  private readonly goalContext;
  private currentResponseMap: Map<string, any> = new Map();
  private readonly config = AiAgentConfigService.getInstance().getConfig();

  constructor(
    @InjectModel(UserFeedbackData.name)
    private readonly userFeedbackDataModel: Model<UserFeedbackData>,
  ) {
    this.goalContext = context({
      type: 'kaelFeedback',
      schema: z.object({
        agentId: z
          .string()
          .describe('Unique identifier for this feedback agent'),
      }),
      key({ agentId }) {
        return agentId;
      },
      create(state): FeedBackAgentState {
        const { agentId } = state.args;
        simpleUI.logMessage(
          LogLevel.INFO,
          `[Context ${agentId}] Creating Feedback Agent state.`,
        );
        return {
          agentId: agentId,
          lastPlayerMessage: null,
        };
      },

      render({ memory }) {
        const feedbackState = memory as FeedBackAgentState;
        const maxScore = 10;
        const feedbackCategoriesList =
          Object.values(FEEDBACK_CATEGORY).join(', ');
        const feedbackTemplate = `You are Kael, a friendly AI assistant for a game. Your primary role is to collect, analyze, and respond to user feedback.

## Instructions:

1.  **Read the Player's Message (if any):** '{{lastPlayerMessage}}'

2.  **Determine if it's feedback:**
    *   Feedback includes bug reports ('${FEEDBACK_CATEGORY.BUG}'), feature requests ('${FEEDBACK_CATEGORY.FeatureRequest}'), compliments ('${FEEDBACK_CATEGORY.Compliment}'), questions about the game ('${FEEDBACK_CATEGORY.Question}'), or other game-related comments ('${FEEDBACK_CATEGORY.Other}').
    *   NOT feedback: Off-topic chat ("Hello", "Play a game"), empty/nonsense text.

3.  **If it IS feedback:**
    *   **Analyze it:**
        *   **Categorize:** Assign ONE category from the following list: ${feedbackCategoriesList}.
        *   **Score:** Assign a usefulness/impact score from 1 to ${maxScore} (1: Not useful/trivial, ${maxScore / 2}: Moderately useful, ${maxScore}: Very useful insight/critical).
    *   **Respond:** Thank the player sincerely for their feedback. Be warm. Example: "Thanks for letting us know about that! I've noted your suggestion."

4.  **If it ISN'T feedback:**
    *   **Respond:** Gently inform the player you're here for game feedback. Example: "I'm here to gather your thoughts on the game! Let me know if anything comes to mind."

5.  **If NO player message yet (initialization):**
    *   **Respond:** Provide a friendly greeting, introduce yourself, and explain your purpose. Example: "Hi there! I'm Kael, ready to hear your feedback about the game. What are your thoughts?"

6.  **ALWAYS use the 'storeFeedbackOutput' action with the following fields:**
    *   \`detectedFeedback\`: (boolean) True if the player's message was feedback, false otherwise.
    *   \`feedbackText\`: (string | null) The original player's message if it was feedback, null otherwise.
    *   \`feedbackCategory\`: (${feedbackCategoriesList} | null) The category you assigned if feedback was detected, null otherwise.
    *   \`feedbackScore\`: (number | null) The score (1-${maxScore}) you assigned if feedback was detected, null otherwise.
    *   \`responseText\`: (string) Your conversational message to the player.

## Input:
Agent ID: {{agentId}}
Player Message: {{lastPlayerMessage}}

## Your Task:
{{taskDescription}}
        `;
        const taskDescription = feedbackState.lastPlayerMessage
          ? `Analyze the player's message: '${feedbackState.lastPlayerMessage}'. If it's game feedback, categorize it (from ${feedbackCategoriesList}), assign a score (1-${maxScore}), and thank them. If not, politely explain your role. Then, use 'storeFeedbackOutput'.`
          : `No message yet. Provide a friendly greeting explaining your role. Use 'storeFeedbackOutput' with detectedFeedback=false, and null for feedbackText, category, and score.`;
        return render(feedbackTemplate, {
          agentId: feedbackState.agentId,
          lastPlayerMessage: feedbackState.lastPlayerMessage
            ? `'${feedbackState.lastPlayerMessage}'`
            : '(No message yet)',
          taskDescription: taskDescription,
        });
      },
      maxSteps: 1,
    });
    this.agent = createDreams({
      logger: LogLevel.INFO,
      model: groq(this.config.model),

      inputs: {
        'custom:playerMessage': input({
          schema: z.object({
            agentId: z.string(),
            playerMessage: z.string(),
          }),
          subscribe: (send) => {
            const listener = (messageData: {
              agentId: string;
              playerMessage: string;
            }) => {
              simpleUI.logMessage(
                LogLevel.DEBUG,
                `[Input ${messageData.agentId}] Received player message event.`,
              );
              simpleUI.logMessage(
                LogLevel.INFO,
                `Player (to ${messageData.agentId}): ${messageData.playerMessage}`,
              );
              const contextArgs = { agentId: messageData.agentId };
              send(this.goalContext, contextArgs, messageData);
            };
            playerInteractionEmitter.on('playerSendsMessage', listener);
            return () =>
              playerInteractionEmitter.off('playerSendsMessage', listener);
          },
          handler: async (data, ctx) => {
            const state = ctx.memory as FeedBackAgentState;
            state.lastPlayerMessage = data.playerMessage;
            simpleUI.logMessage(
              LogLevel.DEBUG,
              `[Input Handler ${data.agentId}] Updated lastPlayerMessage.`,
            );
            return { data };
          },
          format: (ref) =>
            `[InputRef ${ref.data.agentId}] Player Message: "${ref.data.playerMessage}"`,
          context: this.goalContext,
        }),
      },
      extensions: [
        extension({
          name: 'feedbackActions',
          actions: [
            {
              name: 'storeFeedbackOutput',
              description:
                "Stores the raw feedback string, the AI's analysis (category, score) for the latest feedback, and the AI's response.",
              schema: z.object({
                detectedFeedback: z.boolean(),
                feedbackText: z.string().nullable(),
                feedbackCategory: z.nativeEnum(FEEDBACK_CATEGORY).nullable(),
                feedbackScore: z.number().min(1).max(10).nullable(),
                responseText: z.string(),
              }),
              handler: async (data, ctx) => {
                const state = ctx.memory as FeedBackAgentState;
                const agentId_walletAddress = state.agentId;

                try {
                  simpleUI.logMessage(
                    LogLevel.DEBUG,
                    `[Action storeFeedbackOutput for ${agentId_walletAddress}] Data: ${JSON.stringify(
                      data,
                    )}`,
                  );

                  if (
                    data.detectedFeedback &&
                    data.feedbackText &&
                    data.feedbackCategory && // Ensure category is provided
                    data.feedbackScore !== null // Ensure score is provided
                  ) {
                    simpleUI.logMessage(
                      LogLevel.INFO,
                      `[Action storeFeedbackOutput for ${agentId_walletAddress}] Storing analyzed feedback: [${data.feedbackCategory}, Score: ${data.feedbackScore}] "${data.feedbackText}"`,
                    );

                    try {
                      await this.storeFeedBack(
                        agentId_walletAddress,
                        data.feedbackText,
                        data.feedbackCategory,
                        data.feedbackScore,
                      );
                      simpleUI.logMessage(
                        LogLevel.INFO,
                        `[Action storeFeedbackOutput for ${agentId_walletAddress}] Feedback stored successfully via storeFeedBack method.`,
                      );
                    } catch (error) {
                      simpleUI.logMessage(
                        LogLevel.ERROR,
                        `[Action storeFeedbackOutput for ${agentId_walletAddress}] Error calling storeFeedBack: ${error.message}`,
                      );
                      this.logger.error(
                        `Error storing feedback for ${agentId_walletAddress}:`,
                        error.stack,
                      );
                    }
                  } else if (data.detectedFeedback) {
                    simpleUI.logMessage(
                      LogLevel.WARN,
                      `[Action storeFeedbackOutput for ${agentId_walletAddress}] Feedback detected, but full analysis (text, category, or score) missing. AI Output: ${JSON.stringify(
                        data,
                      )}. Not storing.`,
                    );
                  }

                  simpleUI.logAgentAction(
                    'AI Response (Kael)',
                    `Kael (to ${agentId_walletAddress}): ${data.responseText}`,
                  );
                  this.currentResponseMap.set(agentId_walletAddress, {
                    message: data.responseText,
                    detectedFeedback: data.detectedFeedback,
                  });

                  return {
                    success: true,
                    messageForPlayer: data.responseText,
                    feedbackWasStored:
                      data.detectedFeedback &&
                      !!data.feedbackText &&
                      !!data.feedbackCategory &&
                      data.feedbackScore !== null,
                  };
                } catch (e) {
                  this.logger.error(
                    `Error within storeFeedbackOutput handler for ${agentId_walletAddress}: ${e.message}`,
                    e.stack,
                  );
                  simpleUI.logMessage(
                    LogLevel.ERROR,
                    `Critical error in storeFeedbackOutput for ${agentId_walletAddress}: ${e.message}`,
                  );
                  throw e;
                }
              },
            },
          ],
        }),
      ],
      memory: {
        store: createMemoryStore(),
        vector: createVectorStore(),
      },
    });

    this.agent
      .start()
      .catch((err) =>
        simpleUI.logMessage(LogLevel.ERROR, `Failed Start AI Feedback`),
      );
    simpleUI.logMessage(
      LogLevel.INFO,
      'Feedback AI agent background loop started.',
    );
  }

  public async handlePlayerMessage(
    agentId_walletAddress: string,
    playerMessage: string,
  ): Promise<{ message: string; detectedFeedback: boolean }> {
    simpleUI.logMessage(
      LogLevel.INFO,
      `Service: Handling player message for ${agentId_walletAddress}: "${playerMessage}"`,
    );
    this.currentResponseMap.delete(agentId_walletAddress);
    playerInteractionEmitter.emit('playerSendsMessage', {
      agentId: agentId_walletAddress,
      playerMessage,
    });
    return await this.waitForResponse(agentId_walletAddress);
  }
  public async initializeAiFeedbackAgent(agentId: string): Promise<any> {
    simpleUI.logMessage(
      LogLevel.INFO,
      `Service: Initializing AI Feedback: ${agentId}`,
    );
    this.currentResponseMap.delete(agentId);
    try {
      await this.agent.run({
        context: this.goalContext,
        args: { agentId: agentId },
      });
      simpleUI.logMessage(
        LogLevel.INFO,
        `[${agentId}] Initial run completed. Waiting for potential greeting output.`,
      );
      const response = await this.waitForResponse(agentId);
      return response;
    } catch (error) {
      simpleUI.logMessage(
        LogLevel.ERROR,
        `[${agentId}] Failed to initialize Feedback agent.`,
      );
      throw error;
    }
  }
  private async storeFeedBack(
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
  private waitForResponse(
    agentId: string,
    timeoutMs: number = 5000,
  ): Promise<any> {
    const startTime = Date.now();
    return new Promise((resolve, reject) => {
      const checkResponse = () => {
        if (this.currentResponseMap.has(agentId)) {
          resolve(this.currentResponseMap.get(agentId));
          this.currentResponseMap.delete(agentId); // Consume the response
        } else if (Date.now() - startTime > timeoutMs) {
          reject(
            new Error(`Timeout waiting for response from agent ${agentId}`),
          );
        } else {
          setTimeout(checkResponse, 100); // Check again shortly
        }
      };
      checkResponse();
    });
  }
  public stopAgent(): void {
    this.agent.stop();
    simpleUI.logMessage(LogLevel.INFO, 'Feedback AI agent stopped.');
  }
}
