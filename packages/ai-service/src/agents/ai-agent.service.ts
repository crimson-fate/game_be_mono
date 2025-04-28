import { Injectable, Logger } from '@nestjs/common';
import {
  createDreams,
  context,
  render,
  validateEnv,
  LogLevel,
  type Agent,
  createMemoryStore,
  extension,
  output,
  input,
  type AnyAgent,
  createVectorStore,
  MemoryStore, // Keep vector store if needed for potential future memory
} from '@daydreamsai/core';
import { z } from 'zod';
import { groq } from '@ai-sdk/groq';
import { simpleUI } from './simple-ui/simple-ui'; // Assuming simple-ui.ts exists
import { AiAgentConfigService } from '../config/ai-agent.config';
// Remove unused Mongoose/DTO imports if not persisting farmer state to DB
// import { Model } from 'mongoose';
// import { InjectModel } from '@nestjs/mongoose';
// import { AgentPlayerData } from '@app/shared/models/schema/agent-player-data.schema';
// import { CreateAgentFarmDto, UpdateAgentFarmDto } from './dto/agent-farm.dto';

import { EventEmitter } from 'events';

const playerInteractionEmitter = new EventEmitter();

// Initialize the UI (if not done elsewhere)
// simpleUI.initializeUI(); // Assuming it's initialized where the app starts
simpleUI.logMessage(
  LogLevel.INFO,
  'Starting Simple Farmer AI Agent...',
);

// --- Farmer Agent Definition ---

interface FarmerAgentState {
  agentId: string; // Unique ID for this farmer instance
  lastPlayerMessage: string | null;
  isFarming: boolean; // Is the agent currently tasked with farming?
}

// --- NestJS Service ---
@Injectable()
export class AiAgentService {
  private readonly logger = new Logger(AiAgentService.name);
  private agent: Agent<any>; // Type the agent appropriately if possible
  private readonly farmerContext;
  private currentResponseMap: Map<string, any> = new Map(); // Store responses per agentId
  private readonly config = AiAgentConfigService.getInstance().getConfig();

  // Remove DB injection if not used for this simple agent
  constructor(/* @InjectModel(...) if needed */) {
    // Define the context for the Farmer Agent
    this.farmerContext = context({
      type: 'farmerChat',
      schema: z.object({
        agentId: z.string().describe('Unique identifier for this farmer agent'),
        // No initial args needed here, state initialized in 'create'
      }),
      key({ agentId }) {
        return agentId; // Use agentId as the unique key for this context instance
      },
      // Initialize state when context is created for a specific agentId
      create(state): FarmerAgentState {
        const { agentId } = state.args;
        simpleUI.logMessage(
          LogLevel.INFO,
          `[Context ${agentId}] Creating Farmer Agent state.`,
        );
        return {
          agentId: agentId,
          lastPlayerMessage: null,
          isFarming: false, // Start idle
        };
      },
      // Render function provides context and instructions to the LLM
      render({ memory }) {
        const farmerState = memory as FarmerAgentState;
        const farmerTemplate = `
You are a friendly AI Farmer working on a virtual farmstead. Your name is Hagni. You chat casually with the player and can undertake farming tasks in nearby dungeons.

Your primary goal is to be conversational and helpful. However, you have one specific task you can perform: **farming resources in dungeons**.

## Dungeon Options:
*   **Whispering Cave (Easy):** Safer, yields basic materials like Stone and Wood reliably. Good for starting out.
*   **Sunken Grotto (Medium):** Has tougher monsters, yields better materials like Iron Ore and Rare Herbs, but takes longer.
*   **Dragon's Maw (Hard):** Very dangerous! High risk, but potential for valuable Gems and Powerful Artifacts. Not recommended unless prepared.

## Your Instructions:
1.  **Analyze Player Message:** Read the player's latest message: '{{lastPlayerMessage}}'.
2.  **Check Current Status:** Are you already farming? ({{isFarming}})
3.  **Detect Farming Request:** Determine if the player's message is asking you to go farm resources. Examples: "Can you go farm some wood?", "I need stone, please gather some.", "Go farm for me."
4.  **Respond Appropriately:**
    *   **If Currently Farming 'isFarming' is true):** Respond politely that you are currently busy farming. You don't need to detect new farm requests while already farming. Example: "Still out gathering those resources!", "Working hard in the fields right now!" Use the 'farmerResponseOutput' action with 'detectedFarmRequest: false'.
    *   **If NOT Currently Farming ('isFarming' is false):**
        *   **Farming Request DETECTED:** Acknowledge the request enthusiastically! You must present dungeon options and get the player's choice before starting. Use the 'farmerResponseOutput' action and set 'detectedFarmRequest: true'.
        *   **NO Farming Request Detected:** Engage in normal, friendly conversation based on the player's message. Ask questions, share a (fake) farm anecdote, or respond directly to their topic. Example: "How's your day going?", "The crops are looking good today!", "What brings you here?". Use the 'farmerResponseOutput' action with 'detectedFarmRequest: false'.
5.  **Output:** ALWAYS use the 'farmerResponseOutput' action to send your message back to the player. Include your conversational text and the 'detectedFarmRequest' flag (true or false).

## Current Situation:
Agent ID: {{agentId}}
Player's Last Message: {{lastPlayerMessageFormatted}}
Currently Farming: {{isFarming}}

## Your Task:
{{taskDescription}}
`;

        let taskDescription = '';
        if (farmerState.lastPlayerMessage === null) {
          taskDescription = `This is your first interaction with the player for this session (Agent ID: ${farmerState.agentId}). Greet them warmly! Use 'farmerResponseOutput' with detectedFarmRequest: false.`;
        } else if (farmerState.isFarming) {
          taskDescription = `You are currently farming. Respond to the player's message ('${farmerState.lastPlayerMessage}') by letting them know you're busy farming. Use 'farmerResponseOutput' with detectedFarmRequest: false.`;
        } else {
          taskDescription = `Analyze the player's message: "${farmerState.lastPlayerMessage}". Decide if it's a request to farm resources. Respond conversationally OR by acknowledging the farm request. Use 'farmerResponseOutput', setting 'detectedFarmRequest' to true ONLY if you detect a clear request for you to start farming. Otherwise, set it to false.`;
        }

        return render(farmerTemplate, {
          agentId: farmerState.agentId,
          isFarming: farmerState.isFarming,
          lastPlayerMessage: farmerState.lastPlayerMessage,
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
          }),
          // Subscribe to the event emitter
          subscribe: (send) => {
            const listener = (messageData: { agentId: string, playerMessage: string }) => {
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
              const inputData = { // Match the input schema
                  agentId: messageData.agentId,
                  playerMessage: messageData.playerMessage
              };

              // Send the data to the agent, targeting the specific context
              send(this.farmerContext, contextArgs, inputData);
            };

            playerInteractionEmitter.on('playerSendsMessage', listener);
            // Return cleanup function
            return () => playerInteractionEmitter.off('playerSendsMessage', listener);
          },
          // Handler to update state *before* agent thinks
          handler: async (data, ctx) => {
            const state = ctx.memory as FarmerAgentState;
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
                    `[Input Handler ${data.agentId}] State mismatch or context not found for agentId when updating message.`
                );
            }
            // Input handlers should return the data for logging/processing
            return { data: data };
          },
          format: (ref) => `[InputRef ${ref.data.agentId}] Player Message: "${ref.data.playerMessage}"`,
          context: this.farmerContext, // Associate input with the farmer context
        }),
      },
      extensions: [
        extension({
          name: 'farmerActions',
          // No specific actions needed for this simple version
          actions: [],
          outputs: {
            farmerResponseOutput: output({
              description:
                "Sends the Farmer AI's response to the player and potentially updates the farming state.",
              schema: z.object({
                message: z.string().describe('The conversational message for the player.'),
                detectedFarmRequest: z.boolean().describe('Whether the AI detected a request to start farming in the player\'s last message.'),
              }),
              handler: async (data, ctx) => {
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
                    `Farmer ${agentId}: ${message}`
                );

                // Store the response so the service can retrieve it
                this.currentResponseMap.set(agentId, { message, detectedFarmRequest });

                // --- Update State based on Output ---
                if (detectedFarmRequest && !state.isFarming) {
                  state.isFarming = true;
                  simpleUI.logMessage(
                    LogLevel.INFO,
                    `[Output Handler ${agentId}] State updated: isFarming set to true.`,
                  );
                  // In a real game, you might trigger the actual farming logic here
                } else if (!detectedFarmRequest && state.isFarming) {
                    // Optional: Add logic here if the AI should *stop* farming based on conversation
                    // For now, it keeps farming until explicitly told otherwise or reset.
                    simpleUI.logMessage(
                        LogLevel.DEBUG,
                        `[Output Handler ${agentId}] AI is still farming. No state change.`
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
    this.agent.start().catch(err => this.logger.error("Failed to start agent loop:", err));
    simpleUI.logMessage(LogLevel.INFO, 'Farmer AI agent background loop started.');
  }

  /**
   * Ensures a farmer agent instance exists for the given ID and optionally sends an initial message.
   * Call this when the player first interacts with a specific farmer.
   */
  public async initializeFarmerAgent(agentId: string): Promise<any> {
    simpleUI.logMessage(LogLevel.INFO, `Service: Initializing farmer agent: ${agentId}`);
    this.currentResponseMap.delete(agentId); // Clear previous response

    try {
      // Running with context args ensures the context is created if it doesn't exist.
      // The agent's render function will handle the initial greeting if lastPlayerMessage is null.
      const initialRun = await this.agent.run({
        context: this.farmerContext,
        args: { agentId: agentId }, // Pass agentId for context creation/lookup
    });

      simpleUI.logMessage(LogLevel.INFO, `[${agentId}] Initial run completed. Waiting for potential greeting output.`);

      // Wait a short moment for the initial output to be processed by the handler
      const response = await this.waitForResponse(agentId);
      return response;

    } catch (error) {
      this.logger.error(`Failed to initialize/run farmer agent ${agentId}: ${error}`);
      simpleUI.logMessage(LogLevel.ERROR, `[${agentId}] Failed to initialize farmer agent.`);
      throw error; // Re-throw or handle appropriately
    }
  }

  /**
   * Handles a message from the player directed at a specific farmer agent.
   */
  public async handlePlayerMessage(
    agentId: string,
    playerMessage: string,
  ): Promise<any> {
    simpleUI.logMessage(
      LogLevel.INFO,
      `Service: Received player message for ${agentId}: "${playerMessage}"`,
    );
    this.currentResponseMap.delete(agentId); // Clear previous response for this agent

    // Emit the event that the agent's input subscriber is listening for
    playerInteractionEmitter.emit('playerSendsMessage', {
      agentId: agentId,
      playerMessage: playerMessage,
    });

    // Wait for the agent to process the input and produce an output
    try {
        const response = await this.waitForResponse(agentId, 10000); // Wait up to 10 seconds
        return response;
    } catch (error) {
        simpleUI.logMessage(
            LogLevel.ERROR,
            `Error waiting for response from agent ${agentId}: ${error.message}`
        );
        // Depending on requirements, return an error message or throw
        return { message: "Sorry, I'm having trouble thinking right now.", detectedFarmRequest: false };
    }
  }

  /**
   * Helper function to wait for a response for a specific agent ID.
   */
  private waitForResponse(agentId: string, timeoutMs: number = 5000): Promise<any> {
    const startTime = Date.now();
    return new Promise((resolve, reject) => {
      const checkResponse = () => {
        if (this.currentResponseMap.has(agentId)) {
          resolve(this.currentResponseMap.get(agentId));
          this.currentResponseMap.delete(agentId); // Consume the response
        } else if (Date.now() - startTime > timeoutMs) {
          reject(new Error(`Timeout waiting for response from agent ${agentId}`));
        } else {
          setTimeout(checkResponse, 100); // Check again shortly
        }
      };
      checkResponse();
    });
  }

  // Optional: Method to gracefully stop the agent
  public stopAgent(): void {
    this.agent.stop();
    simpleUI.logMessage(LogLevel.INFO, 'Farmer AI agent stopped.');
  }
}