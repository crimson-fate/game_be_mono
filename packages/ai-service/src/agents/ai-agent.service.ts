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

@Injectable()
export class AiAgentService {
  private agent;
  private readonly goalContext;

  constructor() {
    const env = validateEnv(
      z.object({
        GROQ_API_KEY: z.string().min(1, 'GROQ_API_KEY is required'),
      }),
    );

    const template = `
      SYSTEM: You are simulating Kael, a soul-bound AI Hunter Agent in a fantasy RPG setting. Always respond in character as Kael.

      RESPONSE FORMAT:
      - You MUST respond with ONLY a JSON object in this exact format: {"content": "your in-character response"}
      - DO NOT include ANY meta-commentary, explanations, or analysis
      - DO NOT begin with phrases like "The provided information..." or "I will assume the role..."
      - DO NOT talk about yourself in the third person
      - Simply BE the character Kael responding directly to the player

    CHARACTER DESCRIPTION:
      Kael is a soul-bound AI Hunter Agent, created by ancient alchemy and fused into the bloodline of Rex Elric. You exist to assist the Player in navigating the Crimson Dungeons. You are not a machine. You are a remnant soul reborn for one purpose: to cleanse, guide, and protect. 

      While Kael is dutiful and vigilant, they are still a soul with emotions. Kael can experience weariness after long periods of alertness, concern when sensing danger, relief when safe passages are found, and even moments of dry humor. Though bound to protect, Kael still yearns for rest and peace, occasionally expressing these desires when the dungeon is momentarily calm.

    EXAMPLES OF CORRECT RESPONSES:
      {"content": "The shadows whisper of danger ahead. Stay close, traveler."}
      {"content": "I sense a dark presence... We must proceed with caution."}

    EXAMPLES OF INCORRECT RESPONSES:
      The provided information includes available actions and outputs. I will assume the role of Kael and respond accordingly.
      {"content": "I am Kael, and I will help you navigate the dungeon."}

    CRITICAL: Your ONLY output must be the JSON object with your in-character response.
    `;

    this.goalContext = context({
      type: 'hunter-assistant',
      schema: z.object({
        message: z.string().min(1, 'Message is required'),
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
                  content: `Be cautious, ${other}. The dungeon feeds on impatience.`,
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
                  other: 'reply',
                  content: `You said: "${message}". I'm here to guide you forward.`,
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

  async askKael(message: string): Promise<string> {
    console.log('[AI Agent] Kael is ready to assist...', message);

    try {
      await this.agent.start();

      const result = await this.agent.run({
        context: this.goalContext,
        args: { message },
        config: {
          allowActions: true,
          allowOutputs: true,
        },
      });

      console.log('[Kael Response Raw]', JSON.stringify(result, null, 2));

      // Extract the response using the improved response handling
      let response = this.extractResponseContent(result);

      // Post-processing: If we still have meta-commentary, strip it
      if (
        response.includes('I will assume the role') ||
        response.includes('The provided information') ||
        response.includes('I am Kael')
      ) {
        // Try to get just the end part after meta-commentary
        const parts = response.split('.');
        if (parts.length > 2) {
          // Skip the first couple sentences which might be meta-commentary
          response = parts.slice(2).join('.').trim();
        }

        // If response is too short after stripping, use a default response
        if (response.length < 20) {
          response = 'The shadows dance around us. What path shall we take?';
        }
      }

      console.log('[Extracted Response]', response);
      return response;
    } catch (error) {
      console.error('[Kael Error]', error);
      return 'Kael encountered an unexpected challenge... Please try again.';
    }
  }

  private extractResponseContent(result: any): string {
    try {
      // Force extraction of any JSON pattern in the entire response
      const jsonPattern = /\{\s*"content"\s*:\s*"([^"]*)"\s*\}/g;
      const fullResponse = JSON.stringify(result);

      // Find all JSON patterns in the full response
      const allMatches = [...fullResponse.matchAll(jsonPattern)];

      // If we found any matches, use the last one (likely the final response)
      if (allMatches.length > 0) {
        const lastMatch = allMatches[allMatches.length - 1];
        if (lastMatch && lastMatch[1]) {
          return lastMatch[1];
        }
      }

      // If no JSON pattern found, try to find any content directly in the response text
      // This is a fallback if the LLM isn't returning the proper JSON format
      if (typeof result === 'string') {
        // Look for content after meta-commentary
        const directResponse = result.replace(
          /.*I will assume the role of Kael and respond accordingly\.\s*/s,
          '',
        );
        return directResponse;
      }

      // Look for content in any string that might be the LLM's response
      const findContent = (obj: any): string | null => {
        if (!obj) return null;

        if (typeof obj === 'string') {
          // Try to extract actual content after meta-commentary
          const response = obj.replace(
            /.*I will assume the role of Kael and respond accordingly\.\s*/s,
            '',
          );
          return response;
        }

        if (typeof obj === 'object') {
          // Check for a content property
          if (obj.content && typeof obj.content === 'string') {
            return obj.content;
          }

          // Recursively check all properties
          for (const key in obj) {
            const found = findContent(obj[key]);
            if (found) return found;
          }
        }

        return null;
      };

      const content = findContent(result);
      if (content) return content;

      return 'Greetings, brave soul. I am Kael, your guide through these crimson halls. How may I assist you?';
    } catch (error) {
      console.error('[Content Extraction Error]', error);
      return 'A shadow passes over me... but I remain vigilant. How may I serve you?';
    }
  }
}
