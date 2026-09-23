import type { MembershipRole } from '@mcp-saas-starter/database';
import { createSupabaseClient } from '@mcp-saas-starter/database';
import { resolveUserContext } from '@mcp-saas-starter/auth';
import type { AuthInfo } from '@modelcontextprotocol/server';
import type { Request } from 'express';
import { requireSupabasePublishableKey, requireSupabaseUrl } from '../env.js';

/**
 * Tenant context for one MCP request.
 * organizationId and role come from membership, never from the client payload.
 */
export type McpAuthContext = {
  userId: string;
  organizationId: string;
  role: MembershipRole;
  /** OAuth client_id of the connecting MCP client, when the token has one. */
  clientId: string | null;
  scopes: string[];
  accessToken: string;
};

export class RequestAuthError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'RequestAuthError';
    this.status = status;
    this.code = code;
  }
}

function readAuth(req: Request): AuthInfo | undefined {
  return (req as Request & { auth?: AuthInfo }).auth;
}

function readUserId(auth: AuthInfo): string {
  const userId = auth.extra?.userId;
  if (typeof userId === 'string' && userId.length > 0) return userId;
  throw new RequestAuthError(401, 'invalid_token', 'Access token is missing a user id.');
}

/**
 * Resolve organization + role for a bearer token already verified by
 * `requireBearerAuth`. Rejects accounts with no membership.
 */
export async function authenticate(req: Request): Promise<void> {
  const auth = readAuth(req);
  if (!auth) {
    throw new RequestAuthError(401, 'invalid_token', 'Missing access token.');
  }

  const userId = readUserId(auth);
  const clientId =
    auth.clientId ||
    (typeof auth.extra?.clientId === 'string' ? auth.extra.clientId : null) ||
    null;

  const userClient = createSupabaseClient(
    requireSupabaseUrl(),
    requireSupabasePublishableKey(),
    { accessToken: auth.token },
  );

  let userContext;
  try {
    userContext = await resolveUserContext(userClient, userId);
  } catch (error) {
    console.error(
      'Failed to resolve membership:',
      error instanceof Error ? error.message : 'unknown error',
    );
    throw new RequestAuthError(
      500,
      'server_error',
      'Could not resolve organization membership.',
    );
  }

  if (!userContext) {
    throw new RequestAuthError(
      403,
      'access_denied',
      'This account is not a member of an organization.',
    );
  }

  const mcpContext: McpAuthContext = {
    userId: userContext.userId,
    organizationId: userContext.organizationId,
    role: userContext.role,
    clientId,
    scopes: auth.scopes,
    accessToken: auth.token,
  };

  req.mcpContext = mcpContext;
}
