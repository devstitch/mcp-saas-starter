import type { RateLimiter, RateLimitDecision } from './types.js';

type Bucket = {
  count: number;
  resetAt: number;
};

export function createMemoryRateLimiter(now: () => number = Date.now): RateLimiter {
  const buckets = new Map<string, Bucket>();

  return {
    async check(key, limit, windowSeconds): Promise<RateLimitDecision> {
      const current = now();
      const bucketKey = `${key}\n${limit}\n${windowSeconds}`;
      const existing = buckets.get(bucketKey);

      if (!existing || current >= existing.resetAt) {
        buckets.set(bucketKey, { count: 1, resetAt: current + windowSeconds * 1000 });
        return { allowed: true };
      }

      existing.count += 1;
      if (existing.count > limit) {
        const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - current) / 1000));
        return { allowed: false, retryAfterSeconds };
      }

      return { allowed: true };
    },
  };
}
