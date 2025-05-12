import { EventEmitter } from 'events';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
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
import { FeedbackDto } from '../dto/chat.dto';
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
      inputs: {
        'custom:PlayerMessage': input({
          schema: z.object({
            agentId: z.string(),
            playerMessage: z.string(),
          }),
        }),
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
        const feedbackTemplate = `You are Hagni, a friendly AI designed to collect and respond to user feedback about the game.

You only have ONE job: detect and respond to player feedback.

## Instructions:

1. **Read the Player's Message:** '{{lastPlayerMessage}}'

2. **Decide if it’s feedback.** Feedback includes:
   - Bug reports: "This feature is broken", "The screen froze"
   - Suggestions: "You should add more levels", "Make enemies smarter"
   - General impressions: "I love this!", "This is confusing"

   NOT feedback:
   - Off-topic chat like “Hello?”, “Play a game with me”, “What’s your name?”
   - Empty or nonsense text

3. **Respond Appropriately:**
   - If the message **is helpful feedback**, thank the player sincerely. Be warm and specific if possible.
     Example: “Thanks a lot for the feedback! I’ll make sure the devs see this.”
   - If the message **isn’t feedback**, gently reply that you’re only here to collect feedback.
     Example: “I’m only here to collect feedback about the game! Feel free to let me know what you think.”

4. **ALWAYS use the 'storeFeedbackOutput' action**, and fill these fields:
   - \`detectedFeedback\`: true if feedback detected, false otherwise
   - \`feedbackText\`: the original message if feedback was detected, null otherwise
   - \`responseText\`: your friendly message to the player

## Input:
Agent ID: {{agentId}}
Player Message: {{lastPlayerMessage}}

## Your Task:
{{taskDescription}}
        `;
        const taskDescription = feedbackState.lastPlayerMessage
          ? `Analyze the player's message. If it’s valid feedback, thank them. Otherwise, politely explain that you're only here to collect game feedback.`
          : `No message yet. Wait for the player to say something before replying.`;
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
          // Schema for the data this input expects
          schema: z.object({
            agentId: z.string(),
            playerMessage: z.string(),
          }),
          // Subscribe to the event emitter
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

              // Target the correct context instance using agentId
              const contextArgs = { agentId: messageData.agentId };
              const inputData = {
                // Match the input schema
                agentId: messageData.agentId,
                playerMessage: messageData.playerMessage,
              };

              // Send the data to the agent, targeting the specific context
              send(this.goalContext, contextArgs, inputData);
            };

            playerInteractionEmitter.on('playerSendsMessage', listener);
            // Return cleanup function
            return () =>
              playerInteractionEmitter.off('playerSendsMessage', listener);
          },
          // Handler to update state *before* agent thinks
          handler: async (data, ctx) => {
            const state = ctx.memory as FeedBackAgentState;
            // Ensure we're updating the correct context instance
            if (state && state.agentId === data.agentId) {
              state.lastPlayerMessage = data.playerMessage;
              simpleUI.logMessage(
                LogLevel.DEBUG,
                `[Input Handler ${data.agentId}] Updated lastPlayerMessage.`,
              );
            } else {
              simpleUI.logMessage(
                LogLevel.WARN,
                `[Input Handler ${data.agentId}] State mismatch or context not found for agentId when updating message.`,
              );
            }

            return { data: data };
          },
          format: (ref) =>
            `[InputRef ${ref.data.agentId}] Player Message: "${ref.data.playerMessage}"`,
          context: this.goalContext,
        }),
      },
      extensions: [
        extension({
          name: 'feedbackActions',
          // No specific actions needed for this simple version
          actions: [],
          outputs: {
            feedbackResponseOutput: output({
              description: "Sends the feedback AI's response to the player",
              schema: z.object({
                message: z
                  .string()
                  .describe('The conversational message for the player.'),
                detectedFarmRequest: z
                  .boolean()
                  .describe(
                    "Whether the AI detected a request to start farming in the player's last message.",
                  ),
              }),
              handler: async (data, ctx) => {
                const state = ctx.memory as FeedBackAgentState;
                const { message, detectedFarmRequest } = data;
                const agentId = state.agentId;

                simpleUI.logMessage(
                  LogLevel.DEBUG,
                  `[Output ${agentId}] Received data: ${JSON.stringify(data)}`,
                );

                // Log the AI's response
                simpleUI.logAgentAction(
                  'Feedback Response',
                  `Feedback ${agentId}: ${message}`,
                );

                // Store the response so the service can retrieve it
                this.currentResponseMap.set(agentId, {
                  message,
                  detectedFarmRequest,
                });

                if (detectedFarmRequest) {
                  simpleUI.logMessage(
                    LogLevel.INFO,
                    `[Output Handler ${agentId}] State updated: isFarming set to true.`,
                  );
                } else if (!detectedFarmRequest) {
                  simpleUI.logMessage(
                    LogLevel.DEBUG,
                    `[Output Handler ${agentId}] AI is still farming. No state change.`,
                  );
                }
              },
            }),
          },
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
  /**
   * Initalize AI Agent base on walletAddress of user
   */
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
    data: FeedbackDto,
    aiCategory: FEEDBACK_CATEGORY,
    aiScore: number,
  ): Promise<void> {
    try {
      await this.userFeedbackDataModel.findOneAndUpdate(
        { walletAddress: data.walletAddress },
        {
          $push: { feedback: data.feedback }, // assuming data.feedback is a string
          $set: {
            aiCategory: aiCategory,
            aiScore: aiScore,
          },
        },
        { upsert: true, new: true },
      );
    } catch (error) {
      console.error(error);
      throw new Error('Error when storing feedback');
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
