import { createClient } from 'redis';
import type { RateLimiter, RateLimitDecision } from './types.js';

type RedisConnection = {
  isOpen: boolean;
  incr: (key: string) => Promise<number>;
  expire: (key: string, seconds: number) => Promise<unknown>;
  ttl: (key: string) => Promise<number>;
  connect: () => Promise<unknown>;
  on: (event: 'error', listener: (error: Error) => void) => void;
};

/**
 * Fixed-window limiter using INCR + EXPIRE. Connects on the first check.
 */
export function createRedisRateLimiter(url: string): RateLimiter {
  let client: RedisConnection | undefined;
  let connecting: Promise<RedisConnection> | undefined;

  async function getClient(): Promise<RedisConnection> {
    if (client?.isOpen) return client;
    if (!connecting) {
      const next = createClient({ url }) as RedisConnection;
      next.on('error', (error) => {
        console.error('Redis rate limiter error:', error.message);
      });
      connecting = next.connect().then(() => {
        client = next;
        return next;
      });
    }
    return connecting;
  }

  return {
    async check(key, limit, windowSeconds): Promise<RateLimitDecision> {
      const redis = await getClient();
      const redisKey = `rate:${key}:${limit}:${windowSeconds}`;
      const count = await redis.incr(redisKey);
      if (count === 1) {
        await redis.expire(redisKey, windowSeconds);
      }
      if (count > limit) {
        const ttl = await redis.ttl(redisKey);
        return { allowed: false, retryAfterSeconds: Math.max(1, ttl) };
      }
      return { allowed: true };
    },
  };
}
