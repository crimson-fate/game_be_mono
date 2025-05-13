import { Injectable } from '@nestjs/common';
import { z } from 'zod';

const configSchema = z.object({
  apiKey: z.string().min(1),
  model: z.string().min(1),
  temperature: z.number().min(0).max(1),
  maxTokens: z.number().min(1),
  maxRetries: z.number().min(0),
  retryDelay: z.number().min(0),
  timeout: z.number().min(0),
  rateLimit: z.object({
    requests: z.number().min(1),
    interval: z.number().min(1),
  }),
});

export type AiAgentConfig = z.infer<typeof configSchema>;

@Injectable()
export class AiAgentConfigService {
  private static instance: AiAgentConfigService;
  private config: AiAgentConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): AiAgentConfigService {
    if (!AiAgentConfigService.instance) {
      AiAgentConfigService.instance = new AiAgentConfigService();
    }
    return AiAgentConfigService.instance;
  }

  private loadConfig(): AiAgentConfig {
    const config = {
      apiKey: process.env.GROQ_API_KEY || '',
      model:
        process.env.AI_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct',
      temperature: process.env.AI_TEMPERATURE
        ? parseFloat(process.env.AI_TEMPERATURE)
        : 0.1,
      maxTokens: process.env.AI_MAX_TOKENS
        ? parseInt(process.env.AI_MAX_TOKENS)
        : 3000,
      maxRetries: process.env.AI_MAX_RETRIES
        ? parseInt(process.env.AI_MAX_RETRIES)
        : 3,
      retryDelay: process.env.AI_RETRY_DELAY
        ? parseInt(process.env.AI_RETRY_DELAY)
        : 1000,
      timeout: process.env.AI_TIMEOUT
        ? parseInt(process.env.AI_TIMEOUT)
        : 30000,
      rateLimit: {
        requests: process.env.AI_RATE_LIMIT_REQUESTS
          ? parseInt(process.env.AI_RATE_LIMIT_REQUESTS)
          : 60,
        interval: process.env.AI_RATE_LIMIT_INTERVAL
          ? parseInt(process.env.AI_RATE_LIMIT_INTERVAL)
          : 60,
      },
    };

    return configSchema.parse(config);
  }

  public getConfig(): AiAgentConfig {
    return this.config;
  }
}
