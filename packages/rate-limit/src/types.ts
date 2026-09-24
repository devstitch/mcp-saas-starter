export type RateLimitDecision = {
  allowed: boolean;
  retryAfterSeconds?: number;
};

export interface RateLimiter {
  check(key: string, limit: number, windowSeconds: number): Promise<RateLimitDecision>;
}
