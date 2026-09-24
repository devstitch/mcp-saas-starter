import { describe, expect, it } from 'vitest';
import { createMemoryRateLimiter } from '../src/memory.js';
import { categoryForName, limitForCategory } from '../src/limits.js';
import { createRateLimiter } from '../src/index.js';

describe('memory rate limiter', () => {
  it('allows requests inside the window and blocks the next one', async () => {
    let now = 1_000;
    const limiter = createMemoryRateLimiter(() => now);

    expect(await limiter.check('user:tool', 2, 60)).toEqual({ allowed: true });
    expect(await limiter.check('user:tool', 2, 60)).toEqual({ allowed: true });
    expect(await limiter.check('user:tool', 2, 60)).toEqual({
      allowed: false,
      retryAfterSeconds: 60,
    });

    now += 60_000;
    expect(await limiter.check('user:tool', 2, 60)).toEqual({ allowed: true });
  });

  it('keeps separate keys independent', async () => {
    const limiter = createMemoryRateLimiter();
    expect((await limiter.check('a', 1, 60)).allowed).toBe(true);
    expect((await limiter.check('a', 1, 60)).allowed).toBe(false);
    expect((await limiter.check('b', 1, 60)).allowed).toBe(true);
  });
});

describe('tool categories', () => {
  it('maps read, write, and delete tools to different limits', () => {
    expect(categoryForName('list_projects')).toBe('read');
    expect(categoryForName('project')).toBe('read');
    expect(categoryForName('organization')).toBe('read');
    expect(categoryForName('create_task')).toBe('write');
    expect(categoryForName('delete_task')).toBe('sensitive');
    expect(limitForCategory('read')).toBeGreaterThan(limitForCategory('write'));
    expect(limitForCategory('write')).toBeGreaterThan(limitForCategory('sensitive'));
  });
});

describe('createRateLimiter', () => {
  it('defaults to memory and requires a Redis URL when selected', () => {
    expect(createRateLimiter({})).toBeTruthy();
    expect(() => createRateLimiter({ RATE_LIMIT_STORE: 'redis' })).toThrow(
      'Missing required env var: RATE_LIMIT_REDIS_URL',
    );
  });
});
