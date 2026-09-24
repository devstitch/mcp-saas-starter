import { createMemoryRateLimiter } from './memory.js';
import { createRedisRateLimiter } from './redis.js';

export type { RateLimiter, RateLimitDecision } from './types.js';
export { createMemoryRateLimiter } from './memory.js';
export { createRedisRateLimiter } from './redis.js';
export { RateLimitError } from './error.js';
export {
  RATE_LIMIT_WINDOW_SECONDS,
  RATE_LIMITS,
  categoryForName,
  limitForCategory,
} from './limits.js';
export type { RateLimitCategory } from './limits.js';

export type RateLimitEnv = {
  RATE_LIMIT_STORE?: string;
  RATE_LIMIT_REDIS_URL?: string;
};

/** Memory by default. Redis only when RATE_LIMIT_STORE=redis. */
export function createRateLimiter(
  env: RateLimitEnv = process.env,
): ReturnType<typeof createMemoryRateLimiter> {
  const store = env.RATE_LIMIT_STORE ?? 'memory';
  if (store === 'memory') return createMemoryRateLimiter();
  if (store === 'redis') {
    const url = env.RATE_LIMIT_REDIS_URL;
    if (!url) {
      throw new Error('Missing required env var: RATE_LIMIT_REDIS_URL');
    }
    return createRedisRateLimiter(url);
  }
  throw new Error(`Invalid RATE_LIMIT_STORE: ${store}`);
}
