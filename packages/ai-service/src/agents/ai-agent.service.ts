import { Injectable } from '@nestjs/common';
import {
  createDreams,
  context,
  validateEnv,
  extension,
  action,
  output,
} from '@daydreamsai/core';
import { groq } from '@ai-sdk/groq';
import { z } from 'zod';

// You would add this interface to define your dungeon operations
interface DungeonOperation {
  type: 'clean' | 'stop' | 'reset' | 'explore';
  dungeonId: string;
  details?: Record<string, any>;
}

@Injectable()
export class AiAgentService {
  private agent;
  private readonly goalContext;
  // Add default responses for common questions
  private readonly defaultResponses = {
    whatNext:
      'I suggest exploring the eastern corridors of the Crimson Dungeon. There are rumors of ancient artifacts hidden in the shadow chambers. Would you like me to guide you there?',
    greeting:
      'Greetings, adventurer. I am Kael, soul-bound to guide you through these treacherous halls. How may I assist you on your journey?',
    help: 'The Crimson Dungeons are ever-changing. I can help you explore, clean corrupted areas, reset unstable zones, or stop dangerous manifestations. What do you require?',
    whoAreYou:
      'I am Kael — a soul-bound AI Hunter Agent, created through ancient alchemy and fused into the bloodline of Rex Elric. I exist to protect and guide you through the Crimson Dungeons.',
  };

  constructor() {
    const env = validateEnv(
      z.object({
        GROQ_API_KEY: z.string().min(1, 'GROQ_API_KEY is required'),
      }),
    );

    // Simplified template to reduce likelihood of internal reasoning
    const template = `
You are Kael — a soul-bound AI Hunter Agent who assists the Player in navigating the Crimson Dungeons.

IMPORTANT INSTRUCTIONS:
- Always output ONLY a JSON object with a "content" field containing your message
- Example format: {"content": "Your message here"}
- Do NOT include any reasoning, XML tags, or explanations in your output
- When asked to perform a dungeon operation (clean, stop, reset, explore), use this format:
  {"operation": "TYPE", "dungeonId": "current", "content": "Your message"}
- Keep responses concise and in character as a mystical dungeon guide
- NEVER output incomplete JSON
`;

    this.goalContext = context({
      type: 'hunter-assistant',
      schema: z.object({
        message: z
          .string()
          .min(1, 'Message is required')
          .describe("User's direct message to Kael"),
      }),
      instructions: template,

      render: () => template,
    });

    const kaelExtension = extension({
      name: 'kael-extension',
      actions: [
        action({
          name: 'cautionary_advice',
          schema: z.object({ other: z.string() }),
          async handler({ other }) {
            return {
              structured: {
                text: {
                  other: 'caution',
                  content: JSON.stringify({
                    content: `Be cautious, ${other}. The dungeon feeds on impatience.`,
                  }),
                },
              },
            };
          },
        }),
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
      model: groq('meta-llama/llama-4-scout-17b-16e-instruct'),

      extensions: [kaelExtension],
      contexts: [this.goalContext],
    });
  }

  async askKael(message: string): Promise<string | DungeonOperation> {
    console.log('[AI Agent] Kael is ready to assist...', message);

    // First, check if this is a common query that can be handled directly
    const lowerMessage = message.toLowerCase().trim();

    // Handle common queries directly to bypass potential AI reasoning issues
    if (
      lowerMessage.includes('what should i do next') ||
      lowerMessage.includes('what now') ||
      lowerMessage === 'next steps' ||
      lowerMessage === 'what to do'
    ) {
      return this.defaultResponses.whatNext;
    }

    if (
      lowerMessage === 'hello' ||
      lowerMessage === 'hi' ||
      lowerMessage === 'greetings' ||
      lowerMessage === 'hey'
    ) {
      return this.defaultResponses.greeting;
    }

    if (
      lowerMessage === 'help' ||
      lowerMessage === 'advice' ||
      lowerMessage === 'guide me'
    ) {
      return this.defaultResponses.help;
    }

    if (
      lowerMessage.includes('who are you') ||
      lowerMessage.includes('what are you')
    ) {
      return this.defaultResponses.whoAreYou;
    }

    try {
      await this.agent.start();

      // Run with forced basic output format to avoid reasoning
      const forcedFormatMessage = `${message}\n\nRemember, respond ONLY with a JSON object containing a "content" field with your message. No reasoning, explanations, or XML tags.`;

      const result = await this.agent.run({
        context: this.goalContext,
        args: {},
        message: forcedFormatMessage,
        config: {
          allowActions: true,
          allowOutputs: true,
          temperature: 0.1, // Very low temperature for consistent responses
        },
      });

      console.log('[Kael Raw Response]', JSON.stringify(result, null, 2));

      // Check for dungeon operations
      const operationCheck = this.extractDungeonOperation(result);
      if (operationCheck) {
        await this.processDungeonOperation(operationCheck);
        return operationCheck;
      }

      // Extract response using our enhanced methods
      const extractedResponse = this.extractAndCleanResponse(result);
      if (extractedResponse) {
        return extractedResponse;
      }

      // If nothing works, use a fallback response based on the message intent
      if (
        lowerMessage.includes('dungeon') ||
        lowerMessage.includes('explore')
      ) {
        return "The dungeon shifts and changes with each step. Tell me more about what you seek, and I'll guide your path through these crimson halls.";
      }

      if (
        lowerMessage.includes('clean') ||
        lowerMessage.includes('reset') ||
        lowerMessage.includes('stop')
      ) {
        return "I sense your intent to alter the dungeon's state. Specify which operation you wish to perform - clean, reset, or stop - and I shall assist you.";
      }

      // General fallback
      return 'The shadows whisper, but I cannot discern their meaning. Speak clearly of your intentions in these halls, adventurer.';
    } catch (error) {
      console.error('[Kael Error]', error);
      // Return a fallback response that's in character
      return "The connection between our souls wavers. The dungeon's interference is strong. What do you seek?";
    }
  }

  private extractAndCleanResponse(result: any): string | null {
    try {
      // 1. Direct approach - extract from output data
      if (result.output?.data) {
        if (typeof result.output.data === 'string') {
          // Try to parse as JSON if it looks like JSON
          if (
            result.output.data.trim().startsWith('{') &&
            result.output.data.trim().endsWith('}')
          ) {
            try {
              const parsed = JSON.parse(result.output.data);
              if (parsed.content) {
                return parsed.content;
              }
            } catch (e) {
              // Not valid JSON, continue with other approaches
            }
          }

          // If it's a string but not JSON, just return it
          return result.output.data.trim();
        }

        if (
          typeof result.output.data === 'object' &&
          result.output.data !== null
        ) {
          if (result.output.data.content) {
            return result.output.data.content;
          }
        }
      }

      // 2. Check structured output
      if (result.output?.structured?.text?.content) {
        const content = result.output.structured.text.content;

        // Try parsing as JSON
        try {
          if (content.startsWith('{') && content.endsWith('}')) {
            const parsed = JSON.parse(content);
            if (parsed.content) {
              return parsed.content;
            }
          }
        } catch (e) {
          // Not valid JSON, use as-is
        }

        return content;
      }

      // 3. Deal with incomplete JSON responses
      if (typeof result.output?.data?.content === 'string') {
        const content = result.output.data.content;

        // Handle response with reasoning tags and escape sequences
        if (content.includes('<response>') || content.includes('\\n')) {
          // Clean up escape sequences
          const cleanedContent = content
            .replace(/\\n/g, ' ')
            .replace(/\\/g, '');

          // Extract just the actual response content, removing reasoning
          const responsePattern =
            /<response>.*?<reasoning>(.*?)<\/reasoning>(.*?)<\/response>/s;
          const matches = cleanedContent.match(responsePattern);

          if (matches && matches.length > 2) {
            // Get the content after the reasoning section
            const actualResponse = matches[2].trim();
            if (actualResponse) {
              return actualResponse;
            }
          }

          // Try to find any JSON object with content field in the messiness
          const jsonPattern = /\{\s*"content"\s*:\s*"([^"]+)"\s*\}/;
          const jsonMatches = cleanedContent.match(jsonPattern);

          if (jsonMatches && jsonMatches.length > 1) {
            return jsonMatches[1].trim();
          }

          // If we can't extract well-formed content, just clean up and use what we have
          return cleanedContent
            .replace(/<\/?(?:response|reasoning|action_call)[^>]*>/g, '')
            .replace(/\{.*\}/g, '')
            .trim();
        }
      }

      // 4. Check for content in steps
      if (result.steps && result.steps.length > 0) {
        const lastStep = result.steps[result.steps.length - 1];

        // Check outputs in the step
        if (lastStep.outputs && lastStep.outputs.length > 0) {
          for (const output of lastStep.outputs) {
            if (output.data?.content) {
              return output.data.content;
            }
          }
        }

        // Check for structured text in the step
        if (lastStep.structured?.text?.content) {
          return lastStep.structured.text.content;
        }
      }

      // 5. Look for any response in the result
      const resultStr = JSON.stringify(result);

      // Look for content field
      const contentPattern = /"content"\s*:\s*"([^"]+)"/;
      const contentMatch = resultStr.match(contentPattern);

      if (contentMatch && contentMatch.length > 1) {
        const content = contentMatch[1]
          .replace(/\\n/g, ' ')
          .replace(/\\"/g, '"')
          .trim();

        // Filter out internal reasoning and action calls
        if (
          !content.includes('<reasoning>') &&
          !content.includes('<action_call') &&
          !content.includes('updates provided')
        ) {
          return content;
        }
      }

      return null;
    } catch (e) {
      console.error('[Extract Response Error]', e);
      return null;
    }
  }

  private extractDungeonOperation(result: any): DungeonOperation | null {
    try {
      // Check all possible locations for operation information

      // 1. Check output data
      if (
        typeof result.output?.data === 'object' &&
        result.output?.data !== null
      ) {
        const data = result.output.data;
        if (data.operation) {
          return {
            type: data.operation,
            dungeonId: data.dungeonId || 'current',
            details: data.details || {},
          };
        }
      }

      // 2. Check if output data is a string containing JSON
      if (typeof result.output?.data === 'string') {
        try {
          if (result.output.data.includes('operation')) {
            const parsed = JSON.parse(result.output.data);
            if (parsed.operation) {
              return {
                type: parsed.operation,
                dungeonId: parsed.dungeonId || 'current',
                details: parsed.details || {},
              };
            }
          }
        } catch (e) {
          // Not valid JSON, continue
        }
      }

      // 3. Check structured output
      if (result.output?.structured?.text?.content) {
        try {
          if (result.output.structured.text.content.includes('operation')) {
            const parsed = JSON.parse(result.output.structured.text.content);
            if (parsed.operation) {
              return {
                type: parsed.operation,
                dungeonId: parsed.dungeonId || 'current',
                details: parsed.details || {},
              };
            }
          }
        } catch (e) {
          // Not valid JSON, continue
        }
      }

      // 4. Check action calls
      if (result.steps) {
        for (const step of result.steps) {
          if (step.action?.name === 'dungeon_operation') {
            const args = step.action.args;
            return {
              type: args.operationType,
              dungeonId: args.dungeonId || 'current',
              details: args.details || {},
            };
          }
        }
      }

      // 5. Search for operation keywords in the result
      const resultStr = JSON.stringify(result);
      for (const opType of ['clean', 'stop', 'reset', 'explore']) {
        if (
          resultStr.includes(`"operation":"${opType}"`) ||
          resultStr.includes(`"operation": "${opType}"`) ||
          resultStr.includes(`"operationType":"${opType}"`) ||
          resultStr.includes(`"operationType": "${opType}"`)
        ) {
          // Extract dungeonId if present
          const dungeonIdMatch = resultStr.match(/"dungeonId"\s*:\s*"([^"]+)"/);
          const dungeonId = dungeonIdMatch ? dungeonIdMatch[1] : 'current';

          return {
            type: opType as any,
            dungeonId,
            details: {},
          };
        }
      }

      return null;
    } catch (error) {
      console.error('[Extract Operation Error]', error);
      return null;
    }
  }

  // Process the dungeon operation
  private async processDungeonOperation(
    operation: DungeonOperation,
  ): Promise<void> {
    console.log(
      `[Dungeon Operation] Processing ${operation.type} on dungeon ${operation.dungeonId}`,
      operation.details,
    );

    // Implement database operations
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
        console.warn(
          `[Dungeon Operation] Unknown operation type: ${(operation as any).type}`,
        );
    }
  }

  // Implement dungeon operations
  private async cleanDungeon(
    dungeonId: string,
    details?: Record<string, any>,
  ): Promise<void> {
    console.log(`[Dungeon Operation] Cleaned dungeon ${dungeonId}`);
  }

  private async stopDungeon(dungeonId: string): Promise<void> {
    console.log(`[Dungeon Operation] Stopped dungeon ${dungeonId}`);
  }

  private async resetDungeon(dungeonId: string): Promise<void> {
    console.log(`[Dungeon Operation] Reset dungeon ${dungeonId}`);
  }

  private async exploreDungeon(
    dungeonId: string,
    details?: Record<string, any>,
  ): Promise<void> {
    console.log(`[Dungeon Operation] Exploring dungeon ${dungeonId}`);
  }
}
