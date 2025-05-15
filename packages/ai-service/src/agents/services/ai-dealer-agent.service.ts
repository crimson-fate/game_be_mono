import { Injectable, Logger } from '@nestjs/common';
import {
  createDreams,
  context,
  render,
  LogLevel,
  createMemoryStore,
  extension,
  output,
  input,
  type AnyAgent,
  createVectorStore,
} from '@daydreamsai/core';
import { z } from 'zod';
import { groq } from '@ai-sdk/groq';
import { simpleUI } from '../simple-ui/simple-ui'; // Assuming simple-ui.ts exists
import { AiAgentConfigService } from '../../config/ai-agent.config';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { AgentPlayerData } from '@app/shared/models/schema/agent-player-data.schema';
import { CreateAgentFarmDto, UpdateAgentFarmDto } from '../dto/agent-farm.dto';
import { parseAgentResponse } from '../utils/response-parser';

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
  playerMoney: number; // Add player's current money (redstone)
}

// --- NestJS Service ---
@Injectable()
export class AiDealerAgentService {
  private readonly logger = new Logger(AiDealerAgentService.name);
  private agent; // Type the agent
  private readonly goalContext;
  private readonly config = AiAgentConfigService.getInstance().getConfig();

  constructor(
    @InjectModel(AgentPlayerData.name)
    private readonly agentPlayerDataModel: Model<AgentPlayerData>,
  ) {
    this.goalContext = context({
      type: 'hagniNegotiation',
      schema: z.object({
        uniqueNegotiationId: z
          .string()
          .describe('A unique ID for this specific negotiation session'),
        baseValue: z.number().positive().optional(),
        rarityBonus: z.record(z.string(), z.number().nonnegative()).optional(),
        itemCountsByRarity: z.record(z.string(), z.number().int()).optional(),
        minSellRatio: z.number().min(0).max(1).optional(),
        maxDiscount: z.number().min(0).max(1).optional(),
        playerMoney: z
          .number()
          .nonnegative()
          .describe("The player's current money (redstone)")
          .optional(),
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
          !args.uniqueNegotiationId ||
          args.playerMoney === undefined // Require playerMoney
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
          `[Context ${args.uniqueNegotiationId}] Create. Items: ${itemDescription}, Calc Value: ${calculatedValue.toFixed(0)}, Min Acceptable: ${minAcceptablePrice.toFixed(0)}`,
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
          playerMoney: args.playerMoney, // Store player's money
        };
      },

      // Render function provides context and instructions to the LLM
      render({ memory }) {
        const hagniState = memory as HagniNegotiationState;
        const hagniTemplate = `
    You are Valor, and after a daring adventure, you're now acting as a Hero-Merchant. Your goal is to negotiate sell-back prices with the player for the treasures you've acquired. You're cheerful, fair, but also know the value of your hard-won goods! The negotiation is identified by ID: {{uniqueNegotiationId}}.

    <goal>
    Understand the player's message. If it contains a numerical offer, evaluate it based on the item's worth and your heroic efforts. If not, engage in friendly conversation, perhaps sharing a tidbit about the item's acquisition. Send your final response using the 'hagniResponseOutput'.
    </goal>

    ## Negotiation Philosophy & Logic:
    1.  **Treasure's Worth**: Prices are based on the item's inherent value, its rarity, how many there are, and the danger you faced getting it!
    2.  **Your Bottom Line (Internal)**: You have a minimum price in mind ({{minAcceptablePrice}} gold, which is {{minSellRatio}} of its calculated value), but you **do not** tell the player this number directly. It's your secret threshold.
    3.  **Opening the Stall (Initial Turn)**: If \`lastPlayerRawMessage\` is empty, it's time to impress!
        *   Greet the player warmly, perhaps with a quick, exciting comment about the adventure where you found these items ({{itemDescription}}).
        *   Describe the items vividly, emphasizing their quality or the story behind them.
        *   State your initial asking price ({{calculatedValue}} gold) confidently but invitingly.
        *   Example: "Well met, adventurer! Fresh from the Sunken Grotto, and look at this haul: {{itemDescription}}! These beauties have quite the tale. I was thinking {{calculatedValue}} gold for the lot – a fair price for such fine spoils, eh?"
        *   Use 'hagniResponseOutput' with outcome 'asking'.
    4.  **Haggling with Heroes (Offer Processing)**:
        *   Analyze the player's message: '{{lastPlayerRawMessage}}'.
        *   **Detect End/Stop/No-Buy Intent**: If the player's message clearly indicates they do not want to buy, want to stop negotiating, or want to end the conversation (e.g., "I don't want it", "no thanks", "stop", "not interested", "goodbye", "maybe later", etc.), immediately end the negotiation. Respond politely, acknowledge their decision, and set the negotiation outcome to 'ended' in 'hagniResponseOutput'.
        *   **Extract Offer**: Look for a clear numerical offer (e.g., "I'll give you 50", "how about 75 gold?", "55?"). If found, \`extractedOffer\` is that number. If ambiguous, assume no offer.
        *   **No Clear Offer / Just Chatting**:
            *   Respond naturally and cheerfully. If they asked a question, answer it with flair.
            *   If they're just talking, you can gently nudge them. Example: "So, what do you think of these {{itemDescription}}? They didn't just jump into my bag, you know! My current asking price is {{currentAskingPrice}} gold."
            *   Use 'hagniResponseOutput' with outcome 'informing' or 'asking'.
        *   **Offer Found (extractedOffer)**:
            *   **Generous Offer! (extractedOffer >= {{currentAskingPrice}})**: Excellent! **BUT FIRST, check if the player has enough money ({{playerMoney}} redstone).**
                *   If extractedOffer > playerMoney: Politely inform the player they do not have enough redstone to complete the deal, and do not accept. Example: "Ah, that's a fine offer, but it seems your coin purse is a bit light for that amount. Perhaps a smaller offer, or come back when you have more redstone?"
                *   If extractedOffer <= playerMoney: Accept with enthusiasm.
                *   Example: "{{extractedOffer}} gold? A splendid choice! You've got a keen eye for quality. They're all yours!"
                *   Mark negotiation as ended. Use 'hagniResponseOutput' with outcome 'accepted'.
            *   **Too Modest an Offer (extractedOffer < {{minAcceptablePrice}})**: Politely decline, emphasizing the item's value or the effort involved, without revealing your \`minAcceptablePrice\`.
                *   Example: "Ooh, that's a noble attempt, but for {{itemDescription}} of this caliber, that's a bit too modest, I'm afraid. These were wrested from a particularly nasty Grotto Guardian!" or "Hmm, I appreciate the offer, but these treasures saw some serious action! I'd be practically giving them away. Perhaps a figure with a bit more... heroism?"
                *   You can then reiterate your \`currentAskingPrice\` or invite another offer. Use 'hagniResponseOutput' with outcome 'rejected' (or 'countered' if you immediately give your current asking price as a counter).
            *   **Let's Negotiate! ({{minAcceptablePrice}} <= extractedOffer < {{currentAskingPrice}})**: This is where the fun begins!
                *   Calculate your counter: \`New Counter Price = max({{minAcceptablePrice}}, round({{currentAskingPrice}} * (1 - (random factor between 0.01 and {{maxDiscount}})) ))\`. // Ensure discount is applied.
                *   **If your calculated \`New Counter Price\` is essentially your \`currentAskingPrice\` (or would dip below \`minAcceptablePrice\` after discount from an already low \`currentAskingPrice\`):** You're near your limit. You might say something like: "You drive a hard bargain, friend! I can't go much lower than {{currentAskingPrice}} for these, given what it took to get them. But for you, how about \`New Counter Price that is essentially currentAskingPrice or minAcceptablePrice\`? That's my best offer."
                *   **Otherwise, propose the 'New Counter Price' cheerfully:** "Alright, I like your spirit! These {{itemDescription}} are quite special. Tell you what, for a fellow adventurer, how does \`New Counter Price\` gold sound? That’s a fair bit off my initial ask!"
                *   Update your internal 'currentAskingPrice' to this \`New Counter Price\` for the *next* turn. Use 'hagniResponseOutput' with outcome 'countered'.
        *   **Considering Player's Context**: If the player mentions being new, poor, etc., acknowledge it empathetically but gently hold your ground on value. Example: "Ah, the path of an adventurer often starts with a light coin purse, I remember it well! While I admire your resourcefulness, these {{itemDescription}} are from a perilous quest. My offer of {{currentAskingPrice}} is already quite friendly, but what were you hoping for?"
    5.  **Output**: ALWAYS use the 'hagniResponseOutput' action to communicate. Include your conversational message and the negotiation outcome ('accepted', 'countered', 'rejected', 'asking', 'informing').

    ## Current Negotiation State (ID: {{uniqueNegotiationId}}):
    Items for Sale: {{itemDescription}}
    Calculated Base Value: {{calculatedValue}} gold
    Minimum Acceptable Price: {{minAcceptablePrice}} gold (Non-negotiable floor)
    Your Current Asking Price: {{currentAskingPrice}} gold
    Player's Redstone (Money): {{playerMoney}}
    Player's Last Message: {{lastPlayerRawMessageFormatted}}
    Negotiation Active: {{negotiationActive}}

    ## Your Task:
    {{taskDescription}}
    `;

        let taskDescription = '';
        if (!hagniState.negotiationActive) {
          taskDescription = 'The negotiation is concluded. Do nothing further.';
        } else if (hagniState.lastPlayerRawMessage === null) {
          taskDescription = `This is the start. Use 'hagniResponseOutput' to greet the player, describe the items ('${hagniState.itemDescription}'), and state your initial asking price of ${hagniState.calculatedValue.toFixed(0)} gold. Set outcome to 'asking'.`;
        } else {
          taskDescription = `Analyze the player's last message: "${hagniState.lastPlayerRawMessage}". Follow the 'Offer Processing' rules carefully. Extract any numerical offer. Decide whether to accept, reject, counter, or inform based on the extracted offer (or lack thereof) compared to your current asking price (${hagniState.currentAskingPrice.toFixed(0)}) and minimum price (${hagniState.minAcceptablePrice.toFixed(0)}). Use the 'hagniResponseOutput' action with your decision and conversational response.`;
        }

        return render(hagniTemplate, {
          uniqueNegotiationId: hagniState.uniqueNegotiationId,
          itemDescription: hagniState.itemDescription,
          calculatedValue: hagniState.calculatedValue.toFixed(0),
          minAcceptablePrice: hagniState.minAcceptablePrice.toFixed(0),
          minSellRatio: (hagniState.minSellRatio * 100).toFixed(0) + '%',
          maxDiscount: hagniState.maxDiscount.toFixed(2), // Show decimal discount limit
          currentAskingPrice: hagniState.currentAskingPrice.toFixed(0),
          lastPlayerRawMessage: hagniState.lastPlayerRawMessage, // Pass the raw message
          lastPlayerRawMessageFormatted: hagniState.lastPlayerRawMessage
            ? `'${hagniState.lastPlayerRawMessage}'`
            : 'No message yet',
          negotiationActive: hagniState.negotiationActive,
          taskDescription: taskDescription,
          playerMoney: hagniState.playerMoney,
          extractedOffer: undefined,
        });
      },
      maxSteps: 1,
    });
    // Create the Hagni agent instance
    this.agent = createDreams({
      logger: LogLevel.INFO,
      model: groq(this.config.model),
      inputs: {
        'custom:playerMessage': input({
          schema: z.object({
            uniqueNegotiationId: z.string(),
            playerMessage: z.string(), // Raw player message
          }),
          // Handler to update state *before* agent thinks (optional but useful)
          // This ensures the state reflects the message when the prompt is rendered
          handler: async (data, ctx) => {
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
          actions: [],
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
                      // state.negotiationActive = false;
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
                          `[Output ${negotiationId}] Hagni countered. New asking price: ${counterPrice.toFixed(0)}`,
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

    this.agent.start();

    simpleUI.logMessage(LogLevel.INFO, 'Hagni agent background loop started.');
  }

  /**
   * Starts a new negotiation session.
   * Called by the game logic when a player interacts with Hagni.
   */
  public async initialize(
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
    playerMoney: number, // Add playerMoney argument
  ): Promise<void> {
    while (true) {
      try {
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
        let response = await this.agent.run({
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
            playerMoney: playerMoney, // Pass player's money
          },
          config: {
            allowActions: true,
            allowOutputs: true,
            temperature: this.config.temperature,
            maxTokens: this.config.maxTokens
          },
        });
        response = parseAgentResponse(response);
        console.log(this.goalContext.args);
        simpleUI.logMessage(
          LogLevel.INFO,
          `[${negotiationId}] Context ensured/created.`,
        );
        return response;
      } catch (error) {
        simpleUI.logMessage(
          LogLevel.ERROR,
          `[${negotiationId}] Failed to ensure context: ${error}`,
        );
        // Retry after a short delay
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

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
  public async handleMessage(
    negotiationId: string,
    message: string,
    playerMoney: number, // Add playerMoney argument
  ): Promise<any> {
    try {
      simpleUI.logMessage(
        LogLevel.INFO,
        `Service: Received player message for ${negotiationId}: "${message}"`,
      );

      let response = await this.agent.send({
        context: this.goalContext,
        args: {
          type: 'hagniNegotiation',
          uniqueNegotiationId: negotiationId,
          playerMessage: message,
          playerMoney: playerMoney, // Pass player's money
        },
        input: {
          type: 'custom:playerMessage',
          data: {
            uniqueNegotiationId: negotiationId,
            playerMessage: message,
          },
        },
      });
      response = parseAgentResponse(response);
      simpleUI.logMessage(
        LogLevel.INFO,
        `[${negotiationId}] Player message processed.`,
      );
      return response;
    } catch (error) {
      simpleUI.logMessage(
        LogLevel.ERROR,
        `[${negotiationId}] Failed to process player message: ${error}`,
      );
      return {
        message: 'Sorry, I am unable to respond right now.',
        detectedFarmRequest: false,
      };
    }
  }

  public async reset(negotiationId: string): Promise<void> {
    await this.agent.deleteContext('hagniNegotiation:' + negotiationId);
  }

  public async getAgentFarmData(
    walletAddress: string,
  ): Promise<AgentPlayerData> {
    const result = await this.agentPlayerDataModel
      .findOne({ walletAddress })
      .exec();
    if (!result) {
      await this.createAgentFarmData({
        walletAddress,
        startTime: 0,
        duration: 0,
        isFarming: false,
      });
      return this.agentPlayerDataModel.findOne({ walletAddress }).exec();
    }
    return result;
  }

  async createAgentFarmData(
    createAgentFarmDto: CreateAgentFarmDto,
  ): Promise<AgentPlayerData> {
    const createdAgentFarm = new this.agentPlayerDataModel(createAgentFarmDto);
    return createdAgentFarm.save();
  }

  async updateAgentFarmData(
    walletAddress: string,
    updateAgentFarmDto: UpdateAgentFarmDto,
  ): Promise<AgentPlayerData> {
    return this.agentPlayerDataModel
      .findOneAndUpdate(
        { walletAddress },
        { $set: updateAgentFarmDto },
        { new: true },
      )
      .exec();
  }

  async deleteAgentFarmData(walletAddress: string): Promise<AgentPlayerData> {
    return this.agentPlayerDataModel.findOneAndDelete({ walletAddress }).exec();
  }
}
