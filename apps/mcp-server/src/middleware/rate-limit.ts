import type { Request } from 'express';
import {
  RATE_LIMIT_WINDOW_SECONDS,
  RateLimitError,
  categoryForName,
  limitForCategory,
  type RateLimiter,
} from '@mcp-saas-starter/rate-limit';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Tool or resource name used in the rate-limit key. Unlisted methods are not limited. */
export function rateLimitSubject(body: unknown): string | null {
  if (!isRecord(body)) return null;
  const method = body.method;
  const params = isRecord(body.params) ? body.params : undefined;

  if (method === 'tools/call' && typeof params?.name === 'string') {
    return params.name;
  }

  if (method === 'resources/read' && typeof params?.uri === 'string') {
    if (params.uri.startsWith('project://')) return 'project';
    if (params.uri === 'organization://current') return 'organization';
  }

  return null;
}

export function rateLimitKey(parts: {
  userId: string;
  organizationId: string;
  clientId: string | null;
  name: string;
}): string {
  return [parts.userId, parts.organizationId, parts.clientId ?? 'unknown', parts.name].join(':');
}

export async function enforceRateLimit(req: Request, limiter: RateLimiter): Promise<void> {
  const name = rateLimitSubject(req.body);
  if (!name) return;

  const category = categoryForName(name);
  if (!category) return;

  const auth = req.mcpContext;
  if (!auth) return;

  const decision = await limiter.check(
    rateLimitKey({
      userId: auth.userId,
      organizationId: auth.organizationId,
      clientId: auth.clientId,
      name,
    }),
    limitForCategory(category),
    RATE_LIMIT_WINDOW_SECONDS,
  );

  if (!decision.allowed) {
    throw new RateLimitError(decision.retryAfterSeconds ?? RATE_LIMIT_WINDOW_SECONDS);
  }
}
