import { AiAgentConfigService } from 'ai-service/src/config/ai-agent.config';

export class RateLimiterService {
  private static instance: RateLimiterService;
  private config = AiAgentConfigService.getInstance().getConfig();
  private requestCounts: Map<string, { count: number; lastReset: number }> =
    new Map();

  private constructor() {}

  public static getInstance(): RateLimiterService {
    if (!RateLimiterService.instance) {
      RateLimiterService.instance = new RateLimiterService();
    }
    return RateLimiterService.instance;
  }

  public async checkLimit(key: string): Promise<boolean> {
    const now = Date.now();
    const limit = this.requestCounts.get(key);

    if (!limit) {
      this.requestCounts.set(key, { count: 1, lastReset: now });
      return true;
    }

    // Reset counter if interval has passed
    if (now - limit.lastReset >= this.config.rateLimit.interval * 1000) {
      this.requestCounts.set(key, { count: 1, lastReset: now });
      return true;
    }

    // Check if limit is exceeded
    if (limit.count >= this.config.rateLimit.requests) {
      return false;
    }

    // Increment counter
    this.requestCounts.set(key, {
      count: limit.count + 1,
      lastReset: limit.lastReset,
    });

    return true;
  }

  public getRemainingRequests(key: string): number {
    const limit = this.requestCounts.get(key);
    if (!limit) {
      return this.config.rateLimit.requests;
    }

    const now = Date.now();
    if (now - limit.lastReset >= this.config.rateLimit.interval * 1000) {
      return this.config.rateLimit.requests;
    }

    return Math.max(0, this.config.rateLimit.requests - limit.count);
  }

  public getResetTime(key: string): number {
    const limit = this.requestCounts.get(key);
    if (!limit) {
      return 0;
    }

    const now = Date.now();
    const timeSinceReset = now - limit.lastReset;
    return Math.max(0, this.config.rateLimit.interval * 1000 - timeSinceReset);
  }
}
