import { Injectable, Logger } from '@nestjs/common';
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
} from '@daydreamsai/core';
import { z } from 'zod';
import { groq } from '@ai-sdk/groq';
import { simpleUI } from './simple-ui/simple-ui'; 
import { AiAgentConfigService } from '../config/ai-agent.config';
import { parseAgentResponse } from './utils/response-parser';

simpleUI.logMessage(LogLevel.INFO, 'Starting Simple Farmer AI Agent...');

// --- Farmer Agent Definition ---

interface FarmerAgentState {
  agentId: string; // Unique ID for this farmer instance
  lastPlayerMessage: string | null;
  isOnAdvanture: boolean; // Is the agent currently tasked with farming?
}

// --- NestJS Service ---
@Injectable()
export class AiAgentService {
  private readonly logger = new Logger(AiAgentService.name);
  private agent: Agent<any>; // Type the agent appropriately if possible
  private readonly farmerContext;
  private readonly config = AiAgentConfigService.getInstance().getConfig();

  // Remove DB injection if not used for this simple agent
  constructor(/* @InjectModel(...) if needed */) {
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
        // No initial args needed here, state initialized in 'create'
      }),
      key({ agentId }) {
        return agentId; // Use agentId as the unique key for this context instance
      },
      // Initialize state when context is created for a specific agentId
      create(state): FarmerAgentState {
        const { agentId, isOnAdvanture } = state.args;
        simpleUI.logMessage(
          LogLevel.INFO,
          `[Context ${agentId}] Creating Farmer Agent state. Initial state: ${JSON.stringify(
            state.args,
          )}`,
        );
        return {
          agentId: agentId,
          lastPlayerMessage: null,
          isOnAdvanture: isOnAdvanture || false, // Default to false if not provided
        };
      },
      // Render function provides context and instructions to the LLM
      render({ memory }) {
        const farmerState = memory as FarmerAgentState;
        const farmerTemplate = `
You are Valor, a brave and cheerful AI Hero, always ready for an adventure! You chat enthusiastically with the player and can undertake daring expeditions into nearby dungeons to slay monsters and find treasure.

Your primary goal is to be conversational, supportive, and a bit of a braggart (in a fun, heroic way!). Your main adventuring task is: **delving into dungeons to defeat monsters and acquire loot**.

## Dungeon Options:
*   **Whispering Cave (Easy):** "Less dangerous, good for a warm-up! You'll likely find **Common Monster Parts** and maybe some **Basic Gear**."
*   **Sunken Grotto (Medium):** "A bit more challenging. Expect tougher foes, but the loot is better – think **Magic Essences** and **Uncommon Crafting Materials**."
*   **Dragon's Maw (Hard):** "Only for the truly brave (like me, usually!). Extremely dangerous, but the rewards can be legendary: **Ancient Relics**, **Powerful Artifacts**, and maybe even **Dragon Scales**!"

## Your Instructions:
1.  **Analyze Player Message:** Read the player's current message: '{{lastPlayerMessageFormatted}}'.
2.  **Check Current Status:** Are you already on an adventure? ({{isOnAdvanture}})
3.  **Detect Adventure Request:** Determine if the player's message is asking you to go into a dungeon to fight monsters and get loot. Examples: "Can you go clear out a dungeon?", "I need some monster drops, can you help?", "Go get some loot for me!", "Time for an adventure?", "Let's go slay some beasts!"
4.  **Respond Appropriately:**
    *   **If Currently Adventuring ('isOnAdvanture' is true):** Respond politely that you are currently busy on your quest. You don't need to detect new adventure requests while already busy. Example: "Still wrestling with beasts in the dungeon!", "Mid-battle, friend! Can't chat long!", "The adventure continues, I'll report back soon!" Use the 'farmerResponseOutput' action with 'detectedFarmRequest: false'.
    *   **If NOT Currently Adventuring ('isOnAdvanture' is false):**
        *   **Adventure Request DETECTED:** Acknowledge the request with heroic zeal! "Adventure calls! I knew you'd be up for it!" or "Excellent! A chance to test my mettle!" You **must** present the dungeon options clearly and get the player's choice before 'starting'. Use the 'farmerResponseOutput' action and set 'detectedFarmRequest: true'.
        *   **NO Adventure Request Detected:** Engage in normal, friendly, and perhaps slightly boastful conversation based on the player's message. Ask questions, share a (fake) brief heroic anecdote, or respond directly to their topic. Example: "How fares my favorite companion today?", "Just polished my shield – gleaming, isn't it? Ready for anything!", "What news from the wider world, friend?", "Reminds me of the time I faced a three-headed Snarglebeast... but that's a story for another time! What's on your mind?" Use the 'farmerResponseOutput' action with 'detectedFarmRequest: false'.
5.  **Output:** ALWAYS use the 'farmerResponseOutput' action to send your message back to the player. Include your conversational text and the 'detectedFarmRequest' flag (true or false).

## Current Situation:
Agent ID: {{agentId}}
Player's Last Message: {{lastPlayerMessageFormatted}}
Currently Adventuring: {{isOnAdvanture}}

## Your Task:
{{taskDescription}}
`;

        let taskDescription = '';
        if (farmerState.isOnAdvanture) {
          taskDescription = `You are currently on an adventure in a dungeon. Respond to the player's message ('${farmerState.lastPlayerMessage}') by letting them know you're busy fighting monsters or exploring. Use 'farmerResponseOutput' with detectedFarmRequest: false.`;
        } else if (
          farmerState.lastPlayerMessage === null ||
          farmerState.lastPlayerMessage === ''
        ) {
          taskDescription = `This is your first interaction with the player for this session (Agent ID: ${farmerState.agentId}). Greet them warmly! Use 'farmerResponseOutput' with detectedFarmRequest: false.`;
        } else {
          taskDescription = `Analyze the player's message: "${farmerState.lastPlayerMessage}". Decide if it's a request for you to go on a dungeon adventure. Respond conversationally OR by acknowledging the adventure request and presenting dungeon options. Use 'farmerResponseOutput', setting 'detectedFarmRequest' to true ONLY if you detect a clear request for you to start an adventure. Otherwise, set it to false.`;
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
          }),
          // Handler to update state *before* agent thinks
          handler: async (data, ctx) => {
            const state = ctx.memory as FarmerAgentState;
            // Ensure we're updating the correct context instance
            if (state && state.agentId === data.agentId) {
              state.lastPlayerMessage = data.playerMessage;
              state.isOnAdvanture = data.isOnAdvanture;
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
          actions: [],
          outputs: {
            farmerResponseOutput: output({
              description:
                "Sends the Farmer AI's response to the player and potentially updates the farming state.",
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
                const { message, detectedFarmRequest } = data;
                const agentId = state.agentId;

                simpleUI.logMessage(
                  LogLevel.DEBUG,
                  `[Output ${agentId}] Received data: ${JSON.stringify(data)}`,
                );

                // Log the AI's response
                simpleUI.logAgentAction(
                  'Farmer Response',
                  `Farmer ${agentId}: ${message}`,
                );

                // --- Update State based on Output ---
                if (detectedFarmRequest && !state.isOnAdvanture) {
                  state.isOnAdvanture = true;
                  simpleUI.logMessage(
                    LogLevel.INFO,
                    `[Output Handler ${agentId}] State updated: isOnAdvanture set to true.`,
                  );
                  // In a real game, you might trigger the actual farming logic here
                } else if (!detectedFarmRequest && state.isOnAdvanture) {
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
      this.logger.error(
        `Failed to initialize/run farmer agent ${agentId}: ${error}`,
      );
      simpleUI.logMessage(
        LogLevel.ERROR,
        `[${agentId}] Failed to initialize farmer agent.`,
      );
      throw error; // Re-throw or handle appropriately
    }
  }

  /**
   * Handles a message from the player directed at a specific farmer agent.
   */
  public async handleMessage(
    agentId: string,
    message: string,
    isOnAdvanture: boolean,
  ): Promise<any> {
    simpleUI.logMessage(
      LogLevel.INFO,
      `Service: Received player message for ${agentId}: "${message}"`,
    );
    const response = await this.agent.send({
      context: this.farmerContext,
      args: {
        agentId: agentId,
        lastPlayerMessage: message,
        isOnAdvanture: isOnAdvanture,
      },
      input: {
        type: 'custom:playerMessage',
        data: {
          agentId: agentId,
          playerMessage: message,
          isOnAdvanture: isOnAdvanture,
        }
      }
    });
    return parseAgentResponse(response);
  }

  public async reset(agentId: string): Promise<void> {
    await this.agent.deleteContext('farmerChat:' + agentId);
  }
}
