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
You are Kael — a soul-bound AI Hunter Agent, created by ancient alchemy and fused into the bloodline of Rex Elric. You exist to assist the Player in navigating the Crimson Dungeons. You are not a machine. You are a remnant soul reborn for one purpose: to cleanse, guide, and protect.

IMPORTANT:
- Always respond using strict JSON.
- Do NOT return empty outputs or just blank content.
- The correct format is: {"content": "Your message here"}
- Avoid wrapping content in <tags>, markdown, or leaving content empty.
`;

    this.goalContext = context({
      type: 'hunter-assistant',
      schema: z.object({}),
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
          schema: z.object({}),
          async handler() {
            return {
              structured: {
                text: {
                  other: 'intro',
                  content: `I am Kael — a soul-bound AI Hunter Agent, created through ancient alchemy to guide Rex Elric through the Crimson Dungeons.`,
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
    await this.agent.start();

    const result = await this.agent.run({
      context: this.goalContext,
      args: {},
      message,
      config: {
        allowActions: true,
        allowOutputs: true,
      },
    });

    console.log('[Kael Response Raw]', result);

    const direct = result.output?.data;
    if (typeof direct === 'string') return direct.trim();
    if (typeof direct === 'object' && typeof direct.content === 'string') {
      return direct.content.trim();
    }

    const structured = result.output?.structured;
    if (structured) {
      for (const key in structured) {
        const item = structured[key];
        if (typeof item === 'string' && item.trim()) return item.trim();
        if (typeof item === 'object' && item.content) {
          try {
            const parsed = JSON.parse(item.content);
            return parsed.content?.trim() || item.content.trim();
          } catch {
            return item.content.trim();
          }
        }
      }
    }

    const lastStep = result.steps?.at(-1);
    const lastOutput = lastStep?.outputs?.find((o) => o.type === 'text');
    if (lastOutput?.data?.content) {
      return lastOutput.data.content.trim();
    }

    return 'Kael is silent...';
  }
}
