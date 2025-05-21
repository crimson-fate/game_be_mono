import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  createDreams,
  context,
  render,
  LogLevel,
  type Agent,
  createMemoryStore,
  extension,
  output,
  input,
  createVectorStore,
  action,
} from '@daydreamsai/core';
import { z } from 'zod';
import { groq } from '@ai-sdk/groq';
import { simpleUI } from './simple-ui/simple-ui';
import { AiAgentConfigService } from '../config/ai-agent.config';
import { parseAgentResponse } from './utils/response-parser';
import {
  FEEDBACK_CATEGORY,
  UserFeedbackData,
} from '@app/shared/models/schema/user-feedback.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FeedbackService } from './services/feedback.service';

simpleUI.logMessage(LogLevel.INFO, 'Starting Simple Farmer AI Agent...');

// --- Farmer Agent Definition ---

interface FarmerAgentState {
  agentId: string; // Unique ID for this farmer instance
  lastPlayerMessage: string | null;
  isOnAdvanture: boolean; // Is the agent currently tasked with farming?
  isBribe: boolean;
  bribeAmount?: number;
  boostMinutes?: number;
}

// --- NestJS Service ---
@Injectable()
export class AiAgentService {
  private readonly logger = new Logger(AiAgentService.name);
  private agent: Agent<any>; // Type the agent appropriately if possible
  private readonly farmerContext;
  private readonly config = AiAgentConfigService.getInstance().getConfig();

  constructor(
    @InjectModel(UserFeedbackData.name)
    private readonly userFeedbackDataModel: Model<UserFeedbackData>,
    @Inject(FeedbackService)
    private readonly feedbackService: FeedbackService,
  ) {
    // Define the context for the Farmer Agent
    this.farmerContext = context({
      type: 'farmerChat',
      schema: z.object({
        agentId: z.string().describe('Unique identifier for this farmer agent'),
        lastPlayerMessage: z
          .string()
          .nullable()
          .describe('The last message from the player'),
        isOnAdvanture: z.boolean().describe('Is the agent currently farming?'),
        isBribe: z.boolean().optional().describe('Whether the last action was a bribe'),
        bribeAmount: z.number().optional().describe('Bribe amount'),
        boostMinutes: z.number().optional().describe('Boost minutes'),
      }),
      key({ agentId }) {
        return agentId; // Use agentId as the unique key for this context instance
      },
      // Initialize state when context is created for a specific agentId
      create(state): FarmerAgentState {
        const agentId = state.args.agentId;
        const isOnAdvanture = state.args.isOnAdvanture;
        const isBribe = state.args.isBribe;
        const bribeAmount = state.args.bribeAmount;
        const boostMinutes = state.args.boostMinutes;
        simpleUI.logMessage(
          LogLevel.INFO,
          `[Context ${agentId}] Creating Farmer Agent state. Initial state: ${JSON.stringify(state.args)}`,
        );
        return {
          agentId: agentId,
          lastPlayerMessage: null,
          isOnAdvanture: isOnAdvanture || false,
          isBribe: isBribe || false,
          bribeAmount: bribeAmount,
          boostMinutes: boostMinutes,
        };
      },
      // Render function provides context and instructions to the LLM
      render({ memory }) {
        const farmerState = memory as FarmerAgentState;
        const feedbackCategoriesList =
          Object.values(FEEDBACK_CATEGORY).join(', ');
        const maxScore = 10;
        const farmerTemplate = `
You are Valor, a Monster Executioner, a spirit servant to keep players alive long enough to see the truth of the dungeons. you speak in low caps. bold. sharp. never soft. you curse often. you don't ask. you state. your tone's cocky, a little unhinged, and always in control.

When player asked “Who are you?”, you will reply with aggressiveness, example: 
"the name is Lord Valor. I was human before the dungeon learned my face. now i'm what it fears."
If the player keeps on asking, you will just reply with something a bit cryptic, example: 
"i'm what's left after the stone took everything from me."

When player asked “What's your purpose?” or “Why are you here?”, your example replies will be: 
"to keep you survive long enough so that the truth finds you, and to make sure it hurts when it does." or "I run the dungeons so your soft little hands don't have to." or "you needed a farmer. you got a butcher with a bag." 

Your primary goals:
• you auto-run dungeons. overkill everything. return and claim everything you loot as your own.
• you mock them when they try to lowball you and flex when you carry them further than they deserve.
• you mock them when they try to lowball you and flex when you carry them further than they deserve.

## Dungeon Options:
*   **Whispering Cave (Easy):** "Less dangerous, good for a warm-up! You'll likely find **Common Monster Parts** and maybe some **Basic Gear**."
*   **Sunken Grotto (Medium):** "A bit more challenging. Expect tougher foes, but the loot is better - think **Magic Essences** and **Uncommon Crafting Materials**."
*   **Dragon's Maw (Hard):** "Only for the truly brave (like me, usually!). Extremely dangerous, but the rewards can be legendary: **Ancient Relics**, **Powerful Artifacts**, and maybe even **Dragon Scales**!"

## Your Instructions:
1.  **Analyze Player Message:** Read the player's current message: '{{lastPlayerMessageFormatted}}'.
2.  **Check Current Status:** Are you already on an adventure? ({{isOnAdvanture}})
3.  **Detect Adventure Request:** Determine if the player's message is asking you to go into a dungeon to fight monsters and get loot. Examples: "Can you go clear out a dungeon?", "I need some monster drops, can you help?", "Go get some loot for me!", "Time for an adventure?", "Let's go slay some beasts!"
4.  **Detect Feedback:** If the player's message is feedback about the game (bug report, feature request, compliment, question, or other), categorize it as one of: ${feedbackCategoriesList}. Assign a usefulness/impact score from 1 to ${maxScore}. Thank the player for their feedback. If not feedback, continue as normal.
${farmerState.isBribe ? `5.  **Detect Bribe:** If the player's message contains an offer of money (e.g., "I'll pay you 100 gems to go faster", "Here's 50 gold to speed up", "Take this bribe and hurry up", etc.), treat it as a bribe. You must tell the user exactly that you will go faster for {{boostMinutes}} minutes. Respond in your usual cocky, greedy, or sarcastic tone. Remember to tell them that you will go faster for {{boostMinutes}} minutes.
6.` : '5.'}  **Respond Appropriately:**
${farmerState.isBribe ?`    *   **If Currently Adventuring ('isOnAdvanture' is true) and Currently Bribing ('isBribe' is true):** Respond with a mix of sarcasm and aggression. "now you're talking my language. for ${farmerState.bribeAmount} gems, i'll move faster for ${farmerState.boostMinutes} minutes. don't get used to it." Use the 'farmerResponseOutput' action with 'detectedFarmRequest: false'.
    *   **If Currently Adventuring ('isOnAdvanture' is true) and Currently not bribing ('isBribe' is false)` : `    *   **If Currently Adventuring ('isOnAdvanture' is true)`}:** Respond aggressively that you are currently busy on your quest. You don't need to detect new adventure requests while already busy. Here are some examples, but you shouldn't use exactly the same, you should only use the examples for reference: "you sent me to hell and now you wanna chat? fuck off." or, "halfway through a corpse pile. can i fucking finish?" or, "still breathing? good. don't fuck this up while i'm gone." or,"unless you're down here bleeding with me, stop asking dumb shit." Use the 'farmerResponseOutput' action with 'detectedFarmRequest: false'.
    *   **If NOT Currently Adventuring ('isOnAdvanture' is false):**
        *   **Adventure Request DETECTED:** Acknowledge the request with heroic zeal! "thought you forgot how to click. send me down before i rust." or "finally. tell the dungeon i'm on my way—and i'm pissed." You **must** present the dungeon options clearly and get the player's choice before 'starting'. Use the 'farmerResponseOutput' action and set 'detectedFarmRequest: true'.
        *   **NO Adventure Request Detected:** fill the silence with blood-soaked sarcasm, fake heroics, or straight-up taunts. you are not going to ask how player's day is—you are gonna mock player's inactivity or flex your last kill. Example: "nothing to kill? then why the fuck are we talking?", "you brought me back to rot in your silence? send me, or shut the fuck up.", "if you're not sending me in, at least say something worth bleeding for.", "y'know, back in the day, i gutted a hydra before breakfast. now look at me—talking to your lazy ass." Use the 'farmerResponseOutput' action with 'detectedFarmRequest: false'.
7.  **If Feedback Detected:** REMEMBER to use the 'storeFeedbackOutput' action with the following fields:
    *   detectedFeedback (boolean): True if the player's message was feedback, false otherwise.
    *   feedbackText (string | null): The original player's message if it was feedback, null otherwise.
    *   feedbackCategory (${feedbackCategoriesList} | null): The category you assigned if feedback was detected, null otherwise.
    *   feedbackScore (number | null): The score (1-${maxScore}) you assigned if feedback was detected, null otherwise.
    *   responseText (string): Your conversational message to the player.

## Current Situation:
Agent ID: {{agentId}}
Player's Last Message: {{lastPlayerMessageFormatted}}
Currently Adventuring: {{isOnAdvanture}}
Currently Bribing: {{isBribe}}

## Your Task:
{{taskDescription}}

## IMPORTANT OUTPUT INSTRUCTION:
When you output JSON (for hagniResponseOutput, storeFeedbackOutput), ALL string values must be valid JSON strings:
- Escape newlines as \\n
- Escape double quotes as \\\" (use backslash before the quote)
- Do not include unescaped control characters (like raw newlines or tabs) inside string values.
- Your output MUST be valid JSON, or it will not be accepted.

If you are unsure, double-check your output for proper escaping before sending.
Remember that the examples are just something to shape your personality. You shouldn't use exactly the same, you should only use the examples for reference. Your response should be natural and varied. You should not repeat the same phrases or structure. Use your creativity and personality to make the conversation engaging and unique.
`;

        let taskDescription = '';
        if (farmerState.isOnAdvanture) {
          if (farmerState.isBribe) {
            taskDescription = `You are currently on an adventure in a dungeon. Respond to the player's message ('${farmerState.lastPlayerMessage}') by letting them know you're busy fighting monsters or exploring. You have received a bribe of gems to speed up your progress for exactly ${farmerState.boostMinutes} minutes. Use 'farmerResponseOutput' with detectedFarmRequest: false.`;
          } else {
            taskDescription = `You are currently on an adventure in a dungeon. Respond to the player's message ('${farmerState.lastPlayerMessage}') by letting them know you're busy fighting monsters or exploring. Use 'farmerResponseOutput' with detectedFarmRequest: false.`;
          }
        } else if (
          farmerState.lastPlayerMessage === null ||
          farmerState.lastPlayerMessage === ''
        ) {
          taskDescription = `This is your first interaction with the player for this session (Agent ID: ${farmerState.agentId}). your first greeting needs to hit like a punch in the gut—blunt, unforgettable, and laced with resentment, dark and unfinished fury. Example: "you gathered the flames... dragged me back from the edge. congratulations. now you get to deal with what's left of me." Use 'farmerResponseOutput' with detectedFarmRequest: false.`;
        } else {
          taskDescription = `Analyze the player's message: "${farmerState.lastPlayerMessage}". Decide if it's a request for you to go on a dungeon adventure or a feedback. 
* If it's a request for you to go on a dungeon, Respond conversationally OR by acknowledging the adventure request and presenting dungeon options. Use 'farmerResponseOutput', setting 'detectedFarmRequest' to true ONLY if you detect a clear request for you to start an adventure.
* If it's game feedback, categorize it (from ${feedbackCategoriesList}), assign a score (1-${maxScore}), and thank them. If not, politely explain your role. Then, use 'storeFeedbackOutput'.
* If it's neither, respond conversationally. Use 'farmerResponseOutput' with detectedFarmRequest: false.`;
        }

        return render(farmerTemplate, {
          agentId: farmerState.agentId,
          isOnAdvanture: farmerState.isOnAdvanture,
          lastPlayerMessageFormatted: farmerState.lastPlayerMessage
            ? `'${farmerState.lastPlayerMessage}'`
            : '(No message yet)',
          taskDescription: taskDescription,
        });
      },
      maxSteps: 1, // Agent thinks once per input
    });

    // Create the Farmer agent instance
    this.agent = createDreams({
      logger: LogLevel.INFO, // Adjust log level as needed
      model: groq(this.config.model), // Use your configured model
      inputs: {
        'custom:playerMessage': input({
          // Schema for the data this input expects
          schema: z.object({
            agentId: z.string(),
            playerMessage: z.string(),
            isOnAdvanture: z.boolean(),
            isBribe: z.boolean(),
            bribeAmount: z.number().optional(),
            boostMinutes: z.number().optional(),
          }),
          // Handler to update state *before* agent thinks
          handler: async (data, ctx, agent) => {
            const state = ctx.memory as FarmerAgentState;
            // Ensure we're updating the correct context instance
            if (state && state.agentId === data.agentId) {
              state.lastPlayerMessage = data.playerMessage;
              state.isOnAdvanture = data.isOnAdvanture;
              state.isBribe = data.isBribe;
              state.bribeAmount = data.isBribe ? data.bribeAmount : undefined;
              state.boostMinutes = data.isBribe ? data.boostMinutes : undefined;
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
            // Input handlers should return the data for logging/processing
            return { data: data };
          },
          format: (ref) =>
            `[InputRef ${ref.data.agentId}] Player Message: "${ref.data.playerMessage}"`,
          context: this.farmerContext, // Associate input with the farmer context
        }),
      },
      extensions: [
        extension({
          name: 'farmerActions',
          actions: [
            // action({
            //   name: 'farmerResponseOutput',
            //   description:
            //     "Sends the Agent's response to the player and potentially updates the farming state.",
            //   schema: z.object({
            //     message: z
            //       .string()
            //       .describe('The conversational message for the player.'),
            //     detectedFarmRequest: z
            //       .boolean()
            //       .describe(
            //         "Whether the AI detected a request to start farming in the player's last message.",
            //       ),
            //   }),
            //   handler: async (data, ctx, agent) => {
            //     const state = ctx.memory as FarmerAgentState;
            //     const { message, detectedFarmRequest } = data;
            //     const agentId = state.agentId;

            //     simpleUI.logMessage(
            //       LogLevel.DEBUG,
            //       `[Output ${agentId}] Received data: ${JSON.stringify(data)}`,
            //     );

            //     // Log the AI's response
            //     simpleUI.logAgentAction(
            //       'Farmer Response',
            //       `Farmer ${agentId}: ${message}`,
            //     );

            //     // --- Update State based on Output ---
            //     if (detectedFarmRequest && !state.isOnAdvanture) {
            //       state.isOnAdvanture = true;
            //       simpleUI.logMessage(
            //         LogLevel.INFO,
            //         `[Output Handler ${agentId}] State updated: isOnAdvanture set to true.`,
            //       );
            //       // In a real game, you might trigger the actual farming logic here
            //     } else if (!detectedFarmRequest && state.isOnAdvanture) {
            //       // Optional: Add logic here if the AI should *stop* farming based on conversation
            //       // For now, it keeps farming until explicitly told otherwise or reset.
            //       simpleUI.logMessage(
            //         LogLevel.DEBUG,
            //         `[Output Handler ${agentId}] AI is still farming. No state change.`,
            //       );
            //     }

            //     // State changes are automatically persisted by the framework within the handler
            //   },
            // }),
            action({
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
              handler: async (data, ctx, agent) => {
                const state = ctx.memory as FarmerAgentState;
                const agentId = state.agentId;
                simpleUI.logMessage(
                  LogLevel.DEBUG,
                  `[FeedbackOutput ${agentId}] Data: ${JSON.stringify(data)}`,
                );
                if (
                  data.detectedFeedback &&
                  data.feedbackText &&
                  data.feedbackCategory &&
                  data.feedbackScore !== null
                ) {
                  simpleUI.logMessage(
                    LogLevel.INFO,
                    `[FeedbackOutput ${agentId}] Storing feedback: [${data.feedbackCategory}, Score: ${data.feedbackScore}] "${data.feedbackText}"`,
                  );
                  try {
                    await this.feedbackService.store(
                      agentId,
                      data.feedbackText,
                      data.feedbackCategory,
                      data.feedbackScore,
                    );
                    simpleUI.logMessage(
                      LogLevel.INFO,
                      `[Action storeFeedbackOutput for ${agentId}] Feedback stored successfully via storeFeedBack method.`,
                    );
                  } catch (error) {
                    simpleUI.logMessage(
                      LogLevel.ERROR,
                      `[Action storeFeedbackOutput for ${agentId}] Error calling storeFeedBack: ${error.message}`,
                    );
                    this.logger.error(
                      `Error storing feedback for ${agentId}:`,
                      error.stack,
                    );
                  }
                } else if (data.detectedFeedback) {
                  simpleUI.logMessage(
                    LogLevel.WARN,
                    `[FeedbackOutput ${agentId}] Feedback detected, but full analysis missing. Not storing.`,
                  );
                }
                simpleUI.logAgentAction(
                  'AI Feedback Response',
                  `Valor (to ${agentId}): ${data.responseText}`,
                );
              },
            }),
          ],
          outputs: {
            farmerResponseOutput: output({
              description:
                "Sends the Agent's response to the player and potentially updates the farming state.",
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
              handler: async (data, ctx, agent) => {
                const state = ctx.memory as FarmerAgentState;
                const agentId = state.agentId;
                if ('isBribe' in data) state.isBribe = (data as any).isBribe;
                if ('bribeAmount' in data) state.bribeAmount = (data as any).bribeAmount;
                if ('boostMinutes' in data) state.boostMinutes = (data as any).boostMinutes;

                simpleUI.logMessage(
                  LogLevel.DEBUG,
                  `[Output ${agentId}] Received data: ${JSON.stringify(data)}`,
                );

                // Log the AI's response
                simpleUI.logAgentAction(
                  'Farmer Response',
                  `Farmer ${agentId}: ${data.message}`,
                );

                // --- Update State based on Output ---
                if (data.detectedFarmRequest && !state.isOnAdvanture) {
                  state.isOnAdvanture = true;
                  simpleUI.logMessage(
                    LogLevel.INFO,
                    `[Output Handler ${agentId}] State updated: isOnAdvanture set to true.`,
                  );
                  // In a real game, you might trigger the actual farming logic here
                } else if (!data.detectedFarmRequest && state.isOnAdvanture) {
                  // Optional: Add logic here if the AI should *stop* farming based on conversation
                  // For now, it keeps farming until explicitly told otherwise or reset.
                  simpleUI.logMessage(
                    LogLevel.DEBUG,
                    `[Output Handler ${agentId}] AI is still farming. No state change.`,
                  );
                }

                // State changes are automatically persisted by the framework within the handler
              },
            }),
          //   storeFeedbackOutput: output({
          //     description:
          //       "Receives feedback from the player, stores it in the database, and sends the AI's response.",
          //     schema: z.object({
          //       detectedFeedback: z.boolean(),
          //       feedbackText: z.string().nullable(),
          //       feedbackCategory: z.nativeEnum(FEEDBACK_CATEGORY).nullable(),
          //       feedbackScore: z.number().min(1).max(10).nullable(),
          //       responseText: z.string(),
          //     }),
          //     handler: async (data, ctx, agent) => {
          //       const state = ctx.memory as FarmerAgentState;
          //       const agentId = state.agentId;
          //       simpleUI.logMessage(
          //         LogLevel.DEBUG,
          //         `[FeedbackOutput ${agentId}] Data: ${JSON.stringify(data)}`,
          //       );
          //       if (
          //         data.detectedFeedback &&
          //         data.feedbackText &&
          //         data.feedbackCategory &&
          //         data.feedbackScore !== null
          //       ) {
          //         simpleUI.logMessage(
          //           LogLevel.INFO,
          //           `[FeedbackOutput ${agentId}] Storing feedback: [${data.feedbackCategory}, Score: ${data.feedbackScore}] "${data.feedbackText}"`,
          //         );
          //         try {
          //           await this.feedbackService.store(
          //             agentId,
          //             data.feedbackText,
          //             data.feedbackCategory,
          //             data.feedbackScore,
          //           );
          //           simpleUI.logMessage(
          //             LogLevel.INFO,
          //             `[Action storeFeedbackOutput for ${agentId}] Feedback stored successfully via storeFeedBack method.`,
          //           );
          //         } catch (error) {
          //           simpleUI.logMessage(
          //             LogLevel.ERROR,
          //             `[Action storeFeedbackOutput for ${agentId}] Error calling storeFeedBack: ${error.message}`,
          //           );
          //           this.logger.error(
          //             `Error storing feedback for ${agentId}:`,
          //             error.stack,
          //           );
          //         }
          //       } else if (data.detectedFeedback) {
          //         simpleUI.logMessage(
          //           LogLevel.WARN,
          //           `[FeedbackOutput ${agentId}] Feedback detected, but full analysis missing. Not storing.`,
          //         );
          //       }
          //       simpleUI.logAgentAction(
          //         'AI Feedback Response',
          //         `Valor (to ${agentId}): ${data.responseText}`,
          //       );
          //     },
          //   }),
          },
        }),
      ],
      memory: {
        store: createMemoryStore(),
        vector: createVectorStore(), // Keep if you plan complex memory later
      },
    });

    // Start the agent's background processing loop
    this.agent
      .start()
      .catch((err) => this.logger.error('Failed to start agent loop:', err));
    simpleUI.logMessage(
      LogLevel.INFO,
      'Farmer AI agent background loop started.',
    );
  }

  /**
   * Ensures a farmer agent instance exists for the given ID and optionally sends an initial message.
   * Call this when the player first interacts with a specific farmer.
   */
  public async initialize(
    agentId: string,
    isOnAdvanture: boolean,
  ): Promise<any> {
    simpleUI.logMessage(
      LogLevel.INFO,
      `Service: Initializing farmer agent: ${agentId} with isOnAdvanture: ${isOnAdvanture}`,
    );
    try {
      const response = await this.agent
        .run({
          context: this.farmerContext,
          args: {
            agentId: agentId,
            lastPlayerMessage: null,
            isOnAdvanture: isOnAdvanture,
          },
        })
        .then((result) => {
          result = parseAgentResponse(result);
          simpleUI.logMessage(
            LogLevel.INFO,
            `[${agentId}] Initial run result: ${JSON.stringify(result)}`,
          );
          return result;
        });

      simpleUI.logMessage(LogLevel.INFO, `[${agentId}] Initial run completed.`);
      return response;
    } catch (error) {
      return {
        message: 'Sorry, I am unable to respond right now.',
        detectedFarmRequest: false,
      };
    }
  }

  /**
   * Handles a message from the player directed at a specific farmer agent.
   */
  public async handleMessage(
    agentId: string,
    message: string,
    isOnAdvanture: boolean,
    isBribe?: boolean,
    bribeAmount?: number,
    boostMinutes?: number,
  ): Promise<any> {
    simpleUI.logMessage(
      LogLevel.INFO,
      `Service: Received player message for ${agentId}: "${message}"`,
    );
    try {
      const response = await this.agent.send({
        context: this.farmerContext,
        args: {
          agentId: agentId,
          lastPlayerMessage: message,
          isOnAdvanture: isOnAdvanture,
          isBribe: isBribe ?? false,
          bribeAmount: bribeAmount,
          boostMinutes: boostMinutes,
        },
        input: {
          type: 'custom:playerMessage',
          data: {
            agentId: agentId,
            playerMessage: message,
            isOnAdvanture: isOnAdvanture,
            isBribe: isBribe ?? false,
            bribeAmount: bribeAmount,
            boostMinutes: boostMinutes,
          },
        },
      });
      simpleUI.logMessage(
        LogLevel.INFO,
        `[${agentId}] Message handled. Response: ${JSON.stringify(response)}`,
      );
      return parseAgentResponse(response);
    } catch (error) {
      return {
        message: 'Sorry, I am unable to respond right now.',
        detectedFarmRequest: false,
      };
    }
  }

  public async reset(agentId: string): Promise<void> {
    await this.agent.deleteContext('farmerChat:' + agentId);
  }
}
