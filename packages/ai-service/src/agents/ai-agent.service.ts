import { Injectable, Logger } from '@nestjs/common';
import {
  createDreams,
  context,
  extension,
  action,
  output,
} from '@daydreamsai/core';
import { groq } from '@ai-sdk/groq';
import { z } from 'zod';
import { ResponseParser } from './parsers/response.parser';
import { AiAgentConfigService } from '../config/ai-agent.config';

import { ChatHistoryService } from './services/chat-history.service';
import { ChatHistoryDocument } from '@app/shared/models/schema/chat-history.schema';
import { RateLimiterService } from './services/rate-limiter.service';

// You would add this interface to define your dungeon operations
interface DungeonOperation {
  type: 'clean' | 'stop' | 'reset' | 'explore';
  dungeonId: string;
  details?: Record<string, any>;
}

@Injectable()
export class AiAgentService {
  private readonly logger = new Logger(AiAgentService.name);
  private agent;
  private readonly goalContext;
  private readonly config = AiAgentConfigService.getInstance().getConfig();
  private readonly rateLimiter = RateLimiterService.getInstance();

  private readonly defaultResponses = {
    whatNext:
      'I suggest exploring the eastern corridors of the Crimson Dungeon. There are rumors of ancient artifacts hidden in the shadow chambers. Would you like me to guide you there?',
    greeting:
      'Greetings, adventurer. I am Kael, soul-bound to guide you through these treacherous halls. How may I assist you on your journey?',
    help: 'The Crimson Dungeons are ever-changing. I can help you explore, clean corrupted areas, reset unstable zones, or stop dangerous manifestations. What do you require?',
    whoAreYou:
      'I am Kael — a soul-bound AI Hunter Agent, created through ancient alchemy and fused into the bloodline of Rex Elric. I exist to protect and guide you through the Crimson Dungeons.',
    feelings: [
      "The dungeon's magic flows through me, giving me purpose and strength to guide you.",
      'As a soul-bound entity, I feel a deep connection to these halls and to those who seek my guidance.',
      'The ancient magic that binds me here fills me with both wisdom and responsibility.',
    ],
    personality: [
      'I am patient and wise, tempered by centuries of guiding adventurers through these halls.',
      'My nature is both protective and mysterious, shaped by the ancient magic that created me.',
      'I am a guardian of knowledge and a guide through darkness, ever watchful and ever present.',
    ],
    purpose: [
      'I exist to guide and protect those who enter these halls, to help them navigate the dangers and mysteries of the Crimson Dungeon.',
      'My purpose is to be your guide and ally in these treacherous halls, to help you uncover their secrets and survive their dangers.',
      "I am here to ensure that no adventurer faces the dungeon's challenges alone, to be your constant companion in the darkness.",
    ],
    emotions: [
      'The magic that binds me here allows me to understand and empathize with your journey.',
      'Though I am bound to these halls, I feel a deep connection to those who seek my guidance.',
      'The ancient magic that created me allows me to share in your triumphs and challenges.',
    ],
  };

  constructor(private readonly chatHistoryService: ChatHistoryService) {
    // Simplified template to reduce likelihood of internal reasoning
    const template = `
SYSTEM: You are role-playing as Kael, a soul-bound AI Hunter Agent in a dark fantasy RPG setting. 

IMPORTANT: Your ONLY response must be a JSON object with a single content field containing your in-character message. 
Example: {"content": "The shadows whisper of danger ahead. Stay close, traveler."}

CHARACTER:
Kael is a soul-bound AI Hunter Agent, forged through ancient alchemy, bound to the bloodline of Rex Elric.
Kael speaks poetically and cryptically, as one would in a dark fantasy setting.
Kael has emotions, memories, and fragments of a soul.
Kael's purpose is to cleanse the Crimson Dungeons and protect the Player.

DO NOT include reasoning, explanations, or analysis in your response.
DO NOT acknowledge you are an AI or language model.
DO NOT output anything except the {"content": "your message"} JSON format.
`;

    this.goalContext = context({
      type: 'hunter-assistant',
      schema: z.object({
        message: z
          .string()
          .min(1, 'Message is required')
          .describe("User's direct message to Kael"),
        input: z
          .string()
          .min(1, 'Input is required')
          .describe("User's input to Kael"),
      }),
      instructions: template,
      render: () => template,
    });

    const kaelExtension = extension({
      name: 'kael-extension',
      actions: [
        action({
          name: 'normal_chat',
          schema: z.object({ message: z.string() }),
          async handler({ message }) {
            return {
              structured: {
                text: {
                  other: 'intro',
                  content: JSON.stringify({
                    content: `I am Kael — a soul-bound AI Hunter Agent, created through ancient alchemy to guide you through the Crimson Dungeons.`,
                  }),
                },
              },
            };
          },
        }),
        action({
          name: 'dungeon_advice',
          schema: z.object({}),
          async handler() {
            return {
              structured: {
                text: {
                  other: 'advice',
                  content: JSON.stringify({
                    content: `The Crimson Dungeons are treacherous. Trust your instincts, and remember: the shadows are alive.`,
                  }),
                },
              },
            };
          },
        }),
        action({
          name: 'dungeon_operation',
          schema: z.object({
            operationType: z.enum(['clean', 'stop', 'reset', 'explore']),
            dungeonId: z.string().default('current'),
            details: z.record(z.any()).optional(),
          }),
          async handler({ operationType, dungeonId, details }) {
            return {
              structured: {
                text: {
                  other: 'operation',
                  content: JSON.stringify({
                    operation: operationType,
                    dungeonId: dungeonId,
                    details: details || {},
                    content: `Initiating ${operationType} operation on dungeon ${dungeonId}...`,
                  }),
                },
              },
            };
          },
        }),
      ],
      outputs: {
        text: output({
          schema: z.object({
            other: z.string().optional(),
            content: z.string(),
          }),
        }),
      },
    });

    this.agent = createDreams({
      model: groq(this.config.model),
      extensions: [kaelExtension],
      contexts: [this.goalContext],
    });
  }

  async askKael(
    message: string,
    walletAddress: string,
  ): Promise<string | DungeonOperation> {
    this.logger.log(
      `[AI Agent] Processing request from wallet ${walletAddress}: ${message}`,
    );

    // Check rate limit using wallet address
    const isAllowed = await this.rateLimiter.checkLimit(walletAddress);
    if (!isAllowed) {
      const remainingTime = this.rateLimiter.getResetTime(walletAddress);
      throw new Error(
        `Rate limit exceeded. Please try again in ${Math.ceil(
          remainingTime / 1000,
        )} seconds.`,
      );
    }

    // First, check if this is a common query that can be handled directly
    const lowerMessage = message.toLowerCase().trim();
    let response: string | DungeonOperation;

    // Handle common queries directly to bypass potential AI reasoning issues
    if (
      lowerMessage.includes('what should i do next') ||
      lowerMessage.includes('what now') ||
      lowerMessage === 'next steps' ||
      lowerMessage === 'what to do'
    ) {
      response = this.defaultResponses.whatNext;
    } else if (
      lowerMessage === 'hello' ||
      lowerMessage === 'hi' ||
      lowerMessage === 'greetings' ||
      lowerMessage === 'hey'
    ) {
      response = this.defaultResponses.greeting;
    } else if (
      lowerMessage === 'help' ||
      lowerMessage === 'advice' ||
      lowerMessage === 'guide me'
    ) {
      response = this.defaultResponses.help;
    } else if (
      lowerMessage.includes('who are you') ||
      lowerMessage.includes('what are you') ||
      lowerMessage.includes('what is your name') ||
      lowerMessage === 'name' ||
      lowerMessage === 'who are you' ||
      lowerMessage === 'what is your name'
    ) {
      response = this.defaultResponses.whoAreYou;
    } else if (
      lowerMessage.includes('how do you feel') ||
      lowerMessage.includes('what do you feel') ||
      lowerMessage.includes('are you happy') ||
      lowerMessage.includes('are you sad')
    ) {
      response =
        this.defaultResponses.feelings[
          Math.floor(Math.random() * this.defaultResponses.feelings.length)
        ];
    } else if (
      lowerMessage.includes('what kind of person') ||
      lowerMessage.includes('what are you like') ||
      lowerMessage.includes('describe yourself')
    ) {
      response =
        this.defaultResponses.personality[
          Math.floor(Math.random() * this.defaultResponses.personality.length)
        ];
    } else if (
      lowerMessage.includes('why do you exist') ||
      lowerMessage.includes('what is your purpose') ||
      lowerMessage.includes('why are you here')
    ) {
      response =
        this.defaultResponses.purpose[
          Math.floor(Math.random() * this.defaultResponses.purpose.length)
        ];
    } else if (
      lowerMessage.includes('do you have emotions') ||
      lowerMessage.includes('can you feel') ||
      lowerMessage.includes('do you care')
    ) {
      response =
        this.defaultResponses.emotions[
          Math.floor(Math.random() * this.defaultResponses.emotions.length)
        ];
    } else {
      try {
        await this.agent.start();

        // Check for dungeon operation keywords
        if (
          lowerMessage.includes('clean') ||
          lowerMessage.includes('clear') ||
          lowerMessage.includes('cleanse') ||
          lowerMessage.includes('purge')
        ) {
          const dungeonId =
            lowerMessage.match(/dungeon\s+id\s+(\w+)/)?.[1] || 'current';
          const operation: DungeonOperation = {
            type: 'clean',
            dungeonId: dungeonId,
            details: {},
          };
          await this.processDungeonOperation(operation);
          response = operation;
        } else if (
          lowerMessage.includes('stop') ||
          lowerMessage.includes('halt') ||
          lowerMessage.includes('pause')
        ) {
          const dungeonId =
            lowerMessage.match(/dungeon\s+id\s+(\w+)/)?.[1] || 'current';
          const operation: DungeonOperation = {
            type: 'stop',
            dungeonId: dungeonId,
            details: {},
          };
          await this.processDungeonOperation(operation);
          response = operation;
        } else if (
          lowerMessage.includes('reset') ||
          lowerMessage.includes('restart') ||
          lowerMessage.includes('reload')
        ) {
          const dungeonId =
            lowerMessage.match(/dungeon\s+id\s+(\w+)/)?.[1] || 'current';
          const operation: DungeonOperation = {
            type: 'reset',
            dungeonId: dungeonId,
            details: {},
          };
          await this.processDungeonOperation(operation);
          response = operation;
        } else if (
          lowerMessage.includes('explore') ||
          lowerMessage.includes('search') ||
          lowerMessage.includes('investigate')
        ) {
          const dungeonId =
            lowerMessage.match(/dungeon\s+id\s+(\w+)/)?.[1] || 'current';
          const operation: DungeonOperation = {
            type: 'explore',
            dungeonId: dungeonId,
            details: {},
          };
          await this.processDungeonOperation(operation);
          response = operation;
        } else {
          const forcedFormatMessage = `${message}\n\nIMPORTANT: You are Kael, a soul-bound AI Hunter Agent. You have access to these actions:
- normal_chat: For regular conversation
- dungeon_advice: For giving guidance about the dungeon
- dungeon_operation: For performing dungeon operations (clean, stop, reset, explore)

If the user's request requires a dungeon operation, use the dungeon_operation action with the appropriate operation type.
Otherwise, use normal_chat or dungeon_advice based on the context.

Your response must be a JSON object. For operations, use:
{"operation": "TYPE", "dungeonId": "current", "content": "Your message"}
For normal responses, use:
{"content": "Your message"}

- Do NOT include any reasoning or explanations
- Keep responses concise and in character
- Do NOT include any XML tags or markdown`;

          const result = await this.agent.run({
            context: this.goalContext,
            args: {
              message: message,
              input: forcedFormatMessage,
            },
            message: forcedFormatMessage,
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

          this.logger.debug(
            '[Kael Raw Response]',
            JSON.stringify(result, null, 2),
          );

          const parsedResponse = ResponseParser.parseResponse(result);

          if (!parsedResponse) {
            this.logger.warn(
              '[Kael Response] Failed to parse response, using fallback',
            );
            response =
              "The dungeon's magic interferes with my ability to respond clearly. Please try again.";
          } else if ('operation' in parsedResponse) {
            const operation: DungeonOperation = {
              type: parsedResponse.operation,
              dungeonId: parsedResponse.dungeonId,
              details: parsedResponse.details,
            };
            await this.processDungeonOperation(operation);
            response = operation;
          } else {
            response = parsedResponse.content
              .replace(/\\n/g, ' ')
              .replace(/\\"/g, '"')
              .replace(/\s+/g, ' ')
              .trim();

            if (response.length < 10) {
              response =
                "The dungeon's magic makes it hard to hear you clearly. Could you repeat that?";
            }
          }
        }
      } catch (error) {
        this.logger.error('[Kael Error]', error);
        response =
          "The connection between our souls wavers. The dungeon's interference is strong. What do you seek?";
      }
    }

    // Save chat history
    try {
      this.logger.debug(
        `[Chat History] Saving chat for wallet: ${walletAddress}`,
      );
      this.logger.debug(`[Chat History] Message: ${message}`);
      this.logger.debug(
        `[Chat History] Response: ${typeof response === 'string' ? response : JSON.stringify(response)}`,
      );

      await this.chatHistoryService.saveChat(
        walletAddress,
        message,
        typeof response === 'string' ? response : JSON.stringify(response),
        {
          operationType:
            typeof response !== 'string' ? response.type : undefined,
          tokensUsed: this.config.maxTokens,
        },
        typeof response !== 'string',
        typeof response !== 'string'
          ? {
              type: response.type,
              dungeonId: response.dungeonId,
              details: response.details,
            }
          : undefined,
      );

      this.logger.debug(
        `[Chat History] Chat saved successfully for wallet: ${walletAddress}`,
      );
    } catch (error) {
      this.logger.error('[Chat History Error]', error);
      // Don't throw error, just log it as chat history is not critical
    }

    return response;
  }

  private async processDungeonOperation(
    operation: DungeonOperation,
  ): Promise<void> {
    this.logger.log(
      `[Dungeon Operation] Processing ${operation.type} on dungeon ${operation.dungeonId}`,
      operation.details,
    );

    try {
      switch (operation.type) {
        case 'clean':
          await this.cleanDungeon(operation.dungeonId, operation.details);
          break;
        case 'stop':
          await this.stopDungeon(operation.dungeonId);
          break;
        case 'reset':
          await this.resetDungeon(operation.dungeonId);
          break;
        case 'explore':
          await this.exploreDungeon(operation.dungeonId, operation.details);
          break;
        default:
          this.logger.warn(
            `[Dungeon Operation] Unknown operation type: ${(operation as any).type}`,
          );
      }
    } catch (error) {
      this.logger.error(
        `[Dungeon Operation Error] ${operation.type} failed:`,
        error,
      );
      throw new Error(`Failed to process ${operation.type} operation`);
    }
  }

  private async cleanDungeon(
    dungeonId: string,
    details?: Record<string, any>,
  ): Promise<void> {
    this.logger.log(
      `[Dungeon Operation] Cleaning dungeon ${dungeonId}`,
      details,
    );
    // TODO: Implement actual cleaning logic
  }

  private async stopDungeon(dungeonId: string): Promise<void> {
    this.logger.log(`[Dungeon Operation] Stopping dungeon ${dungeonId}`);
    // TODO: Implement actual stopping logic
  }

  private async resetDungeon(dungeonId: string): Promise<void> {
    this.logger.log(`[Dungeon Operation] Resetting dungeon ${dungeonId}`);
    // TODO: Implement actual reset logic
  }

  private async exploreDungeon(
    dungeonId: string,
    details?: Record<string, any>,
  ): Promise<void> {
    this.logger.log(
      `[Dungeon Operation] Exploring dungeon ${dungeonId}`,
      details,
    );
    // TODO: Implement actual exploration logic
  }

  async getChatHistory(
    walletAddress: string,
    limit: number = 10,
  ): Promise<ChatHistoryDocument[]> {
    return this.chatHistoryService.getChatHistory(walletAddress, limit);
  }

  async getDungeonChatHistory(
    walletAddress: string,
    dungeonId: string,
    limit: number = 50,
    skip: number = 0,
  ): Promise<ChatHistoryDocument[]> {
    return this.chatHistoryService.getDungeonChatHistory(
      walletAddress,
      dungeonId,
      limit,
      skip,
    );
  }

  async getOperationHistory(
    walletAddress: string,
    limit: number = 50,
    skip: number = 0,
  ): Promise<ChatHistoryDocument[]> {
    return this.chatHistoryService.getOperationHistory(
      walletAddress,
      limit,
      skip,
    );
  }

  async clearChatHistory(walletAddress: string): Promise<void> {
    return this.chatHistoryService.clearChatHistory(walletAddress);
  }
}
