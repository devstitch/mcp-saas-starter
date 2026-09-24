import {
  createMcpExpressApp,
  getOAuthProtectedResourceMetadataUrl,
  mcpAuthMetadataRouter,
  requireBearerAuth,
} from '@modelcontextprotocol/express';
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';
import type { OAuthMetadata } from '@modelcontextprotocol/server';
import type { Express, NextFunction, Request, Response } from 'express';
import { createSupabaseClient } from '@mcp-saas-starter/database';
import { createAuditSink, type AuditSink } from '@mcp-saas-starter/audit';
import { createRateLimiter, type RateLimiter } from '@mcp-saas-starter/rate-limit';
import { UnauthenticatedError } from '@mcp-saas-starter/shared';
import { createSupabaseTokenVerifier } from '../auth/verify-access-token.js';
import {
  allowedServerHostnames,
  mcpEndpointUrl,
  requireSupabasePublishableKey,
  requireSupabaseUrl,
} from '../env.js';
import { audit } from '../middleware/audit.js';
import { authenticate, type McpAuthContext } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { enforceRateLimit } from '../middleware/rate-limit.js';
import { validate } from '../middleware/validate.js';
import { resources } from '../resources/index.js';
import { tools } from '../tools/index.js';
import { toClientError } from './errors.js';
import { createMcpServer } from './create-mcp-server.js';

declare global {
  // Express augments Request through the Express namespace.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      mcpContext?: McpAuthContext;
      mcpAudit?: AuditSink;
    }
  }
}

export type CreateAppConfig = {
  supabaseUrl: string;
  supabasePublishableKey: string;
  mcpServerUrl: string;
  oauthMetadata: OAuthMetadata;
  rateLimiter?: RateLimiter;
};

/**
 * Stateless Streamable HTTP MCP app.
 * `/health` is public. `/mcp` requires a Supabase OAuth access token.
 * Express parses JSON first; the parsed body is passed into handleRequest.
 */
export function createApp(config: CreateAppConfig): Express {
  const allowedHosts = allowedServerHostnames(config.mcpServerUrl);
  const app = createMcpExpressApp({
    allowedHosts,
    allowedOrigins: allowedHosts,
  });
  const endpoint = mcpEndpointUrl(config.mcpServerUrl);

  app.use(
    mcpAuthMetadataRouter({
      oauthMetadata: config.oauthMetadata,
      resourceServerUrl: endpoint,
    }),
  );

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      transport: 'streamable-http',
      framework: 'express',
      toolsRegistered: tools.length,
      resourcesRegistered: resources.length,
    });
  });

  const rateLimiter = config.rateLimiter ?? createRateLimiter();

  const bearerAuth = requireBearerAuth({
    verifier: createSupabaseTokenVerifier({
      supabaseUrl: config.supabaseUrl,
      supabasePublishableKey: config.supabasePublishableKey,
    }),
    resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(endpoint),
  });

  app.all('/mcp', bearerAuth, (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        await validate(req);
        await authenticate(req);
        await authorize(req);
        await enforceRateLimit(req, rateLimiter);

        const auth = req.mcpContext;
        if (!auth) {
          throw new UnauthenticatedError('Missing access token.');
        }

        const mcpAudit = createAuditSink();
        req.mcpAudit = mcpAudit;
        const server = createMcpServer({
          client: createSupabaseClient(requireSupabaseUrl(), requireSupabasePublishableKey(), {
            accessToken: auth.accessToken,
          }),
          userContext: {
            userId: auth.userId,
            organizationId: auth.organizationId,
            role: auth.role,
          },
          audit: mcpAudit,
        });
        const transport = new NodeStreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
        });

        try {
          await server.connect(transport);
          await transport.handleRequest(req, res, req.body);
        } finally {
          await audit(req);
          await server.close().catch(() => undefined);
        }
      } catch (error) {
        if (res.headersSent) {
          next(error);
          return;
        }
        const clientError = toClientError(error);
        if (clientError.headers) {
          for (const [name, value] of Object.entries(clientError.headers)) {
            res.setHeader(name, value);
          }
        }
        res.status(clientError.status).json(clientError.body);
      }
    })();
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    void _req;
    void _next;
    if (res.headersSent) return;
    const parseError =
      err instanceof SyntaxError && 'status' in err && (err as { status?: number }).status === 400;
    if (parseError) {
      res.status(400).json({
        error: 'invalid_request',
        error_description: 'Request body must be JSON.',
      });
      return;
    }
    console.error(err instanceof Error ? err.message : 'Unhandled error');
    const clientError = toClientError(err);
    res.status(clientError.status).json(clientError.body);
  });

  return app;
}
