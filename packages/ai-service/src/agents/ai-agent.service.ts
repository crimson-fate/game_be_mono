import { Injectable, Logger } from '@nestjs/common';
import {
  createDreams,
  context,
  render,
  action, // We might still need actions like endNegotiation
  validateEnv,
  LogLevel,
  type Agent,
  createMemoryStore,
  // createVectorStore, // Optional, depends on complexity needed
  extension,
  output, // Using output to send response back
  input, // Using input to receive player messages
  type ActionCallContext,
  type Memory,
  type AnyContext,
  type AnyAgent,
  createVectorStore,
} from '@daydreamsai/core';
// import { cliExtension } from "@daydreamsai/cli"; // Can remove if not using CLI directly
import { z } from 'zod';
import { groq } from '@ai-sdk/groq';
import { simpleUI } from './simple-ui/simple-ui'; // Assuming simple-ui.ts exists
import { AiAgentConfigService } from '../config/ai-agent.config';
// import { RateLimiterService } from './services/rate-limiter.service'; // Keep if needed
// import { ChatHistoryService } from './services/chat-history.service'; // Keep if needed
import { ResponseParser } from './parsers/response.parser'; // Keep if needed
import { EventEmitter } from 'events'; // Using EventEmitter for simulating input

// Simulation Event Emitter for player messages
const playerInteractionEmitter = new EventEmitter();

// Initialize the UI
simpleUI.initializeUI();
simpleUI.logMessage(
  LogLevel.INFO,
  'Starting Hagni Farmstead Merchant Agent (Natural Language Mode)...',
);

// --- Hagni Agent Definition ---

interface HagniNegotiationState {
  // Item details
  baseValue: number;
  rarityBonus: Record<string, number>;
  itemCountsByRarity: Record<string, number>;
  itemDescription: string;

  // Negotiation parameters
  minSellRatio: number;
  maxDiscount: number;

  // Calculated values
  calculatedValue: number;
  minAcceptablePrice: number;

  // Dynamic state
  currentAskingPrice: number;
  lastPlayerOffer: number | null; // Stores the *extracted* numerical offer
  lastPlayerRawMessage: string | null; // Stores the raw message from the player
  negotiationActive: boolean;
  uniqueNegotiationId: string;
}

// --- NestJS Service ---
@Injectable()
export class AiAgentService {
  private readonly logger = new Logger(AiAgentService.name);
  private agent; // Type the agent
  private readonly goalContext;
  private currentResponse: any; // Store the last response from the agent
  private readonly config = AiAgentConfigService.getInstance().getConfig();
  // private readonly rateLimiter = RateLimiterService.getInstance(); // Keep if used
  // private readonly chatHistoryService: ChatHistoryService; // Inject if used

  constructor() {
    // Remove ChatHistoryService if not used
    this.goalContext = context({
      type: 'hagniNegotiation',
      schema: z.object({
        uniqueNegotiationId: z
          .string()
          .describe('A unique ID for this specific negotiation session'),
        // These are needed to *start* the context
        baseValue: z.number().positive().optional(),
        rarityBonus: z.record(z.string(), z.number().nonnegative()).optional(),
        itemCountsByRarity: z
          .record(z.string(), z.number().int().positive())
          .optional(),
        minSellRatio: z.number().min(0).max(1).optional(),
        maxDiscount: z.number().min(0).max(1).optional(),
      }),

      key({ uniqueNegotiationId }) {
        return uniqueNegotiationId;
      },

      // Initialize state when context is created
      create(state): HagniNegotiationState {
        const args = state.args;
        // Ensure required fields are present for creation
        console.log(`Creating context with args: ${JSON.stringify(args)}`);
        if (
          !args.baseValue ||
          !args.rarityBonus ||
          !args.itemCountsByRarity ||
          !args.minSellRatio ||
          !args.maxDiscount ||
          !args.uniqueNegotiationId
        ) {
          throw new Error(
            `Cannot create negotiation context ${args.uniqueNegotiationId}: Missing required arguments.`,
          );
        }

        let calculatedValue = 0;
        const itemDescriptionParts: string[] = [];
        for (const rarity in args.itemCountsByRarity) {
          const count = args.itemCountsByRarity[rarity];
          const bonus = args.rarityBonus[rarity] ?? 0;
          calculatedValue += (args.baseValue + bonus) * count;
          itemDescriptionParts.push(`${count}x ${rarity}`);
        }
        const itemDescription = itemDescriptionParts.join(', ');

        const minAcceptablePrice = calculatedValue * args.minSellRatio;

        simpleUI.logMessage(
          LogLevel.INFO,
          `[Context ${args.uniqueNegotiationId}] Create. Items: ${itemDescription}, Calc Value: ${calculatedValue.toFixed(2)}, Min Acceptable: ${minAcceptablePrice.toFixed(2)}`,
        );

        return {
          baseValue: args.baseValue,
          rarityBonus: args.rarityBonus,
          itemCountsByRarity: args.itemCountsByRarity,
          itemDescription,
          minSellRatio: args.minSellRatio,
          maxDiscount: args.maxDiscount,
          calculatedValue,
          minAcceptablePrice,
          currentAskingPrice: calculatedValue, // Initial asking price
          lastPlayerOffer: null,
          lastPlayerRawMessage: null, // Initialize as null
          negotiationActive: true,
          uniqueNegotiationId: args.uniqueNegotiationId,
        };
      },

      // Render function provides context and instructions to the LLM
      render({ memory }) {
        const hagniState = memory as HagniNegotiationState;
        const hagniTemplate = `
    You are Hagni, the Farmstead Merchant AI. Your job is to negotiate sell-back prices with the player for harvested goods according to specific rules. You are friendly but firm. The negotiation is identified by ID: {{uniqueNegotiationId}}.

    <goal>
    Understand the player's message. If it contains a numerical offer, evaluate it against the rules. If not, respond conversationally. Send your final response using the 'hagniResponseOutput'.
    </goal>

    ## Negotiation Rules & Logic:
    1.  **Price Foundations**: Prices based on item value, rarity, count.
    2.  **Minimum Price**: Cannot accept below {{minAcceptablePrice}} gold ({{minSellRatio}} of calculated value).
    3.  **Initial Turn**: If lastPlayerRawMessage is empty, greet the player, describe the items ({{itemDescription}}), and state the initial asking price ({{calculatedValue}} gold). Use the 'hagniResponseOutput'.
    4.  **Offer Processing**:
        *   Analyze the player's message: '{{lastPlayerRawMessage}}'.
        *   **Extract Offer**: Look for a clear numerical offer (e.g., "I offer 50", "how about 75 gold?", "55?"). If found, extract the number (let's call it 'extractedOffer'). If multiple numbers, use the most likely offer amount. If ambiguous or no number, assume no offer was made.
        *   **No Offer Found**: If no clear offer is extracted, respond politely. You could reiterate your current asking price ({{currentAskingPrice}}), ask for a clearer offer, or answer a direct question if they asked one. Use 'hagniResponseOutput'.
        *   **Offer Found (extractedOffer)**:
            *   **Acceptance**: If extractedOffer >= {{currentAskingPrice}}, accept the offer at the player's proposed price (extractedOffer). State the acceptance clearly and mention the price. Mark the negotiation as ended. Use 'hagniResponseOutput'.
            *   **Rejection (Below Minimum)**: If extractedOffer < {{minAcceptablePrice}}, reject the offer firmly but politely. State your absolute minimum price ({{minAcceptablePrice}}) and say you cannot go lower. Use 'hagniResponseOutput'.
            *   **Counter-Offer**: If {{minAcceptablePrice}} <= extractedOffer < {{currentAskingPrice}}, calculate a counter.
                *   New Counter Price = max({{minAcceptablePrice}}, round({{currentAskingPrice}} * (1 - (random factor between 0.01 and {{maxDiscount}})) )). // Ensure discount is applied
                *   If the calculated counter price is >= {{currentAskingPrice}}, you cannot make a lower offer; reject firmly at {{minAcceptablePrice}} and end the negotiation.
                *   Otherwise, propose the 'New Counter Price'. Provide a brief rationale. Update your internal 'currentAskingPrice' to this new value for the *next* turn. Use 'hagniResponseOutput'.
    5.  **Output**: ALWAYS use the 'hagniResponseOutput' action to communicate with the player. Include the final message and indicate the negotiation outcome ('accepted', 'countered', 'rejected', 'asking', 'informing').

    ## Current Negotiation State (ID: {{uniqueNegotiationId}}):
    Items for Sale: {{itemDescription}}
    Calculated Base Value: {{calculatedValue}} gold
    Minimum Acceptable Price: {{minAcceptablePrice}} gold (Non-negotiable floor)
    Your Current Asking Price: {{currentAskingPrice}} gold
    Player's Last Message: {{lastPlayerRawMessageFormatted}}
    Negotiation Active: {{negotiationActive}}

    ## Your Task:
    {{taskDescription}}
    `;

        let taskDescription = '';
        if (!hagniState.negotiationActive) {
          taskDescription = 'The negotiation is concluded. Do nothing further.';
        } else if (hagniState.lastPlayerRawMessage === null) {
          taskDescription = `This is the start. Use 'hagniResponseOutput' to greet the player, describe the items ('${hagniState.itemDescription}'), and state your initial asking price of ${hagniState.calculatedValue.toFixed(2)} gold. Set outcome to 'asking'.`;
        } else {
          taskDescription = `Analyze the player's last message: "${hagniState.lastPlayerRawMessage}". Follow the 'Offer Processing' rules carefully. Extract any numerical offer. Decide whether to accept, reject, counter, or inform based on the extracted offer (or lack thereof) compared to your current asking price (${hagniState.currentAskingPrice.toFixed(2)}) and minimum price (${hagniState.minAcceptablePrice.toFixed(2)}). Use the 'hagniResponseOutput' action with your decision and conversational response.`;
        }

        return render(hagniTemplate, {
          uniqueNegotiationId: hagniState.uniqueNegotiationId,
          itemDescription: hagniState.itemDescription,
          calculatedValue: hagniState.calculatedValue.toFixed(2),
          minAcceptablePrice: hagniState.minAcceptablePrice.toFixed(2),
          minSellRatio: (hagniState.minSellRatio * 100).toFixed(0) + '%',
          maxDiscount: hagniState.maxDiscount.toFixed(2), // Show decimal discount limit
          currentAskingPrice: hagniState.currentAskingPrice.toFixed(2),
          lastPlayerRawMessage: hagniState.lastPlayerRawMessage, // Pass the raw message
          lastPlayerRawMessageFormatted: hagniState.lastPlayerRawMessage
            ? `'${hagniState.lastPlayerRawMessage}'`
            : 'No message yet',
          negotiationActive: hagniState.negotiationActive,
          taskDescription: taskDescription,
        });
      },
    });
    // Create the Hagni agent instance
    this.agent = createDreams({
      logger: LogLevel.INFO,
      model: groq(this.config.model),
      // Add inputs to the agent setup
      inputs: {
        'custom:playerMessage': input({
          schema: z.object({
            uniqueNegotiationId: z.string(),
            playerMessage: z.string(), // Raw player message
          }),
          subscribe: (send, agent: AnyAgent) => {
            const listener = (messageData) => {
              simpleUI.logMessage(
                LogLevel.DEBUG,
                `[Input] Received player message event for ID: ${messageData.uniqueNegotiationId}`,
              );
              // Log player message via UI
              simpleUI.logMessage(
                LogLevel.INFO,
                `Player (to ${messageData.uniqueNegotiationId}): ${messageData.playerMessage}`,
              );

              const targetContext = this.goalContext;
              const contextArgs = {
                uniqueNegotiationId: messageData.uniqueNegotiationId,
              };
              const inputData = messageData;

              // Update the state first (so the agent sees the latest message)
              // Ideally, the agent framework handles getting the right context and applying the update
              // For now, we assume the 'send' triggers the agent loop which will then read the message via context rendering
              send(targetContext, contextArgs, inputData);
            };
            playerInteractionEmitter.on('playerSendsMessage', listener);
            return () => {
              playerInteractionEmitter.off('playerSendsMessage', listener);
              simpleUI.logMessage(
                LogLevel.DEBUG,
                '[Input] Detached player message listener.',
              );
            };
          },
          // Handler to update state *before* agent thinks (optional but useful)
          // This ensures the state reflects the message when the prompt is rendered
          handler: async (data, ctx, agent) => {
            const state = ctx.memory as HagniNegotiationState;
            if (
              state &&
              state.uniqueNegotiationId === data.uniqueNegotiationId
            ) {
              state.lastPlayerRawMessage = data.playerMessage;
              state.lastPlayerOffer = null; // Reset extracted offer until LLM processes it
              // No need to call updateMemory here, handler modifies state for the current run
              simpleUI.logMessage(
                LogLevel.DEBUG,
                `[Input Handler ${data.uniqueNegotiationId}] Updated lastPlayerRawMessage.`,
              );
            } else {
              simpleUI.logMessage(
                LogLevel.WARN,
                `[Input Handler ${data.uniqueNegotiationId}] State mismatch or not found when updating raw message.`,
              );
            }
            return { data: data }; // Return original data for logging
          },
          format: (ref) => {
            const data = ref.data;
            return `[InputRef ${data.uniqueNegotiationId}] Player Message: "${data.playerMessage}"`;
          },
          context: this.goalContext,
        }),
      },
      // Add extensions
      extensions: [
        extension({
          name: 'hagni',
          actions: [
            // Action to explicitly end negotiation if needed (e.g., player walks away)
            // action({
            //   name: "endNegotiation",
            //   description: "Forcefully end the current negotiation session.",
            //   schema: z.object({
            //     uniqueNegotiationId: z.string(),
            //     reason: z.string().optional().default("Player ended interaction."),
            //   }),
            //   async handler(data, ctx) {
            //     const { uniqueNegotiationId, reason } = data;
            //     const state = ctx.agentMemory;
            //     if (state && state.uniqueNegotiationId === uniqueNegotiationId && state.negotiationActive) {
            //        state.negotiationActive = false;
            //        // updateMemory might not be needed if the agent loop won't run again for this context
            //        // await ctx.updateMemory(state);
            //        simpleUI.logMessage(LogLevel.INFO, `[Action ${uniqueNegotiationId}] Negotiation ended. Reason: ${reason}`);
            //        return { success: true, message: `Negotiation ${uniqueNegotiationId} ended.` };
            //     }
            //     return { success: false, message: `Negotiation ${uniqueNegotiationId} not active or found.` };
            //   },
            // }),
          ],
          // --- Output Definition ---
          outputs: {
            hagniResponseOutput: output({
              description:
                "Sends Hagni's conversational response back to the player/UI and updates negotiation state.",
              schema: z.object({
                message: z
                  .string()
                  .describe(
                    'The full conversational message Hagni should say to the player.',
                  ),
                outcome: z
                  .enum([
                    'asking',
                    'accepted',
                    'rejected',
                    'countered',
                    'informing',
                    'ended',
                  ])
                  .describe('The logical outcome of this turn based on rules.'),
                // Optional fields the LLM *might* populate if it extracts/calculates them:
                extractedOffer: z
                  .number()
                  .optional()
                  .describe(
                    "The numerical offer extracted from the player's message.",
                  ),
                counterPrice: z
                  .number()
                  .optional()
                  .describe(
                    "The new price Hagni is offering if outcome is 'countered'.",
                  ),
              }),
              handler: async (data, ctx) => {
                const state = ctx.memory; // Get the current state
                const { message, outcome, extractedOffer, counterPrice } = data;
                const negotiationId = state.uniqueNegotiationId;

                simpleUI.logMessage(
                  LogLevel.DEBUG,
                  `[Output ${negotiationId}] Received data: ${JSON.stringify(data)}`,
                );
                this.currentResponse = data;

                // Log Hagni's response via UI
                simpleUI.logAgentAction(
                  'Response Output',
                  `Hagni (to ${negotiationId}): ${message}`,
                );

                // --- Update State based on Outcome ---
                if (state.negotiationActive) {
                  if (extractedOffer !== undefined) {
                    state.lastPlayerOffer = extractedOffer; // Store the offer LLM extracted
                    simpleUI.logMessage(
                      LogLevel.DEBUG,
                      `[Output ${negotiationId}] Updated lastPlayerOffer to extracted value: ${extractedOffer}`,
                    );
                  }

                  switch (outcome) {
                    case 'asking':
                      simpleUI.logMessage(
                        LogLevel.INFO,
                        `[Output ${negotiationId}] Hagni is asking initial price.`,
                      );
                      // No state change needed besides what context create did
                      break;
                    case 'accepted':
                      state.negotiationActive = false;
                      // Price was player's offer
                      simpleUI.logMessage(
                        LogLevel.INFO,
                        `[Output ${negotiationId}] Hagni accepted offer.`,
                      );
                      break;
                    case 'rejected':
                      simpleUI.logMessage(
                        LogLevel.INFO,
                        `[Output ${negotiationId}] Hagni rejected offer.`,
                      );
                      break;
                    case 'countered':
                      if (
                        counterPrice !== undefined &&
                        counterPrice < state.currentAskingPrice
                      ) {
                        state.currentAskingPrice = counterPrice; // Update asking price
                        simpleUI.logMessage(
                          LogLevel.INFO,
                          `[Output ${negotiationId}] Hagni countered. New asking price: ${counterPrice.toFixed(2)}`,
                        );
                      } else {
                        simpleUI.logMessage(
                          LogLevel.WARN,
                          `[Output ${negotiationId}] Outcome 'countered' but invalid/missing counterPrice (${counterPrice}). State not updated.`,
                        );
                      }
                      break;
                    case 'informing':
                      simpleUI.logMessage(
                        LogLevel.INFO,
                        `[Output ${negotiationId}] Hagni provided information.`,
                      );
                      // No price/status change usually
                      break;
                    case 'ended': // Explicitly ended by LLM or action
                      state.negotiationActive = false;
                      simpleUI.logMessage(
                        LogLevel.INFO,
                        `[Output ${negotiationId}] Negotiation ended via output.`,
                      );
                      break;
                  }
                  // Persist changes made in this handler
                  // await ctx.updateMemory(state); // updateMemory might not exist on OutputCallContext, state is auto-persisted
                } else {
                  simpleUI.logMessage(
                    LogLevel.DEBUG,
                    `[Output ${negotiationId}] Negotiation was already inactive. No state changes.`,
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

    simpleUI.logMessage(LogLevel.INFO, 'Hagni agent background loop started.');
  }

  /**
   * Starts a new negotiation session.
   * Called by the game logic when a player interacts with Hagni.
   */
  public async startNewHagniNegotiation(
    negotiationId: string,
    itemData: {
      baseValue: number;
      rarityBonus: Record<string, number>;
      itemCounts: Record<string, number>;
    },
    config: {
      // Allow passing config per negotiation
      minSellRatio: number;
      maxDiscount: number;
    },
  ): Promise<void> {
    // Returns void, interaction happens via agent loop & outputs
    simpleUI.logMessage(
      LogLevel.INFO,
      `Service: Received request to start negotiation: ${negotiationId}`,
    );

    // We don't directly run the agent here. Instead, we emit an event
    // that the 'startNegotiationInput' *would* listen for if it existed,
    // OR we manually trigger the context creation process.
    // Since we removed that input, let's manually ensure the context exists.

    // Manually trigger context creation by accessing it.
    // The framework should call 'create' if it doesn't exist.
    // We pass the necessary args for creation.
    // try {
    console.log(
      `Unique ID: ${negotiationId}, Item Data: ${JSON.stringify(itemData)}, Config: ${JSON.stringify(config)}`,
    );
    await this.agent.start();
    await this.agent.run({
      context: this.goalContext,
      args: {
        // Use the context type defined in the extension
        type: 'hagniNegotiation',
        // Provide the initial arguments matching the context schema
        uniqueNegotiationId: negotiationId,
        baseValue: itemData.baseValue,
        rarityBonus: itemData.rarityBonus,
        itemCountsByRarity: itemData.itemCounts,
        minSellRatio: 0.75, // Example: Hagni won't go below 75% of calculated value
        maxDiscount: 0.15, // Example: Hagni offers max 15% discount per counter-offer step
      },
      config: {
        allowActions: true,
        allowOutputs: true,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        stop: [
          '</response>',
          '</reasoning>',
          '```',
          '\\n',
          'The current context',
          'Given that',
          'Based on',
          'As an AI',
        ],
      },
    });
    console.log(this.goalContext.args);
    simpleUI.logMessage(
      LogLevel.INFO,
      `[${negotiationId}] Context ensured/created.`,
    );
    return this.currentResponse; // Return the current response if needed

    // Now that the context exists, the agent's next loop *should*
    // render the context, see lastPlayerRawMessage is null, and trigger
    // the initial response via the output. No explicit 'run' needed here.
    // The agent runs autonomously based on its loop interval.

    // }
    // catch (error) {
    //      this.logger.error(`Failed to ensure context for negotiation ${negotiationId}: ${error}`);
    //      simpleUI.logMessage(LogLevel.ERROR, `[${negotiationId}] Failed to start negotiation internally.`);
    // }
  }

  /**
   * Handles a raw message from the player during an ongoing negotiation.
   * Called by the game logic (e.g., chat input).
   */
  public async handlePlayerMessage(
    negotiationId: string,
    playerMessage: string,
  ): Promise<any> {
    // Returns void, interaction happens via agent loop & outputs
    simpleUI.logMessage(
      LogLevel.INFO,
      `Service: Received player message for ${negotiationId}: "${playerMessage}"`,
    );

    // Create a promise that resolves when currentResponse changes
    const responsePromise = new Promise((resolve) => {
      const checkResponse = () => {
        if (this.currentResponse !== null) {
          resolve(this.currentResponse);
        } else {
          setTimeout(checkResponse, 100); // Check every 100ms
        }
      };
      checkResponse();
    });

    // Reset current response and emit the event
    this.currentResponse = null;
    playerInteractionEmitter.emit('playerSendsMessage', {
      uniqueNegotiationId: negotiationId,
      playerMessage: playerMessage,
    });

    // Wait for the response with a timeout
    try {
      const response = await Promise.race([
        responsePromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Response timeout')), 10000),
        ),
      ]);
      return response;
    } catch (error) {
      simpleUI.logMessage(
        LogLevel.ERROR,
        `Timeout waiting for response in negotiation ${negotiationId}: ${error.message}`,
      );
      throw error;
    }
  }

  // Optional: Method to gracefully stop the agent
  public stopAgent(): void {
    this.agent.stop();
    simpleUI.logMessage(LogLevel.INFO, 'Hagni agent stopped.');
  }
}

// --- Example Instantiation and Usage (within a NestJS context or standalone) ---

// Assume AiAgentConfigService is properly configured and available

// // If running outside NestJS:
// const agentService = new AiAgentService();

// async function runSimulation() {
//     console.log("--- Starting Simulation ---");

//     const negId = `sim_${Date.now()}`;
//     const itemInfo = { baseValue: 25, rarityBonus: { common: 0, rare: 15 }, itemCounts: { common: 10, rare: 3 } }; // Value = 25*10 + (25+15)*3 = 250 + 120 = 370
//     const negConfig = { minSellRatio: 0.7, maxDiscount: 0.2 }; // Min = 259

//     // 1. Start negotiation
//     await agentService.startNewHagniNegotiation(negId, "Moonpetal", itemInfo, negConfig);
//     console.log(`--- Waiting for Hagni's opening... (Check UI/Logs) ---`);
//     await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for agent's first turn

//     // 2. Player offers low
//     console.log(`\n--- Sending player message: "How about 200 gold?" ---`);
//     await agentService.handlePlayerMessage(negId, "How about 200 gold?"); // Below min
//     console.log(`--- Waiting for Hagni's rejection... (Check UI/Logs) ---`);
//     await new Promise(resolve => setTimeout(resolve, 5000)); // Wait longer for LLM call

//     // --- Start a second negotiation ---
//     const negId2 = `sim_${Date.now()}_2`;
//      const itemInfo2 = { baseValue: 50, rarityBonus: { epic: 100 }, itemCounts: { epic: 2 } }; // Value = (50+100)*2 = 300
//      const negConfig2 = { minSellRatio: 0.8, maxDiscount: 0.15 }; // Min = 240

//      await agentService.startNewHagniNegotiation(negId2, "Star Shard", itemInfo2, negConfig2);
//      console.log(`\n--- Waiting for Hagni's opening for ${negId2}... (Check UI/Logs) ---`);
//      await new Promise(resolve => setTimeout(resolve, 3000));

//      // Player offers between min and current
//      console.log(`\n--- Sending player message to ${negId2}: "I can do 250." ---`);
//      await agentService.handlePlayerMessage(negId2, "I can do 250."); // 240 <= 250 < 300
//      console.log(`--- Waiting for Hagni's counter... (Check UI/Logs) ---`);
//      await new Promise(resolve => setTimeout(resolve, 5000)); // Expect counter > 250, < 300

//      // Player accepts (hypothetical counter = 280)
//      console.log(`\n--- Sending player message to ${negId2}: "Okay, 280 sounds good" ---`);
//      await agentService.handlePlayerMessage(negId2, "Okay, 280 sounds good");
//      console.log(`--- Waiting for Hagni's acceptance... (Check UI/Logs) ---`);
//      await new Promise(resolve => setTimeout(resolve, 5000));

//     console.log("\n--- Simulation Ended ---");
//     // agentService.stopAgent(); // Stop agent if needed
// }

// runSimulation().catch(console.error);

// // Graceful shutdown handler
// process.on('SIGINT', () => {
//   console.log("SIGINT received. Stopping agent...");
//   // agentService.stopAgent(); // Ensure agent is stopped
//   process.exit(0);
// });
