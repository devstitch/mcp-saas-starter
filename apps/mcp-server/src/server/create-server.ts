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
import { ToolInputError } from '@mcp-saas-starter/shared';
import { createSupabaseTokenVerifier } from '../auth/verify-access-token.js';
import {
  allowedServerHostnames,
  mcpEndpointUrl,
  requireSupabasePublishableKey,
  requireSupabaseUrl,
} from '../env.js';
import { audit } from '../middleware/audit.js';
import { authenticate, RequestAuthError, type McpAuthContext } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { validate } from '../middleware/validate.js';
import { resources } from '../resources/index.js';
import { tools } from '../tools/index.js';
import { createMcpServer } from './create-mcp-server.js';

declare global {
  namespace Express {
    interface Request {
      mcpContext?: McpAuthContext;
    }
  }
}

export type CreateAppConfig = {
  supabaseUrl: string;
  supabasePublishableKey: string;
  mcpServerUrl: string;
  oauthMetadata: OAuthMetadata;
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
        await rateLimit(req);

        const auth = req.mcpContext;
        if (!auth) {
          throw new RequestAuthError(401, 'invalid_token', 'Missing access token.');
        }

        const server = createMcpServer({
          client: createSupabaseClient(requireSupabaseUrl(), requireSupabasePublishableKey(), {
            accessToken: auth.accessToken,
          }),
          userContext: {
            userId: auth.userId,
            organizationId: auth.organizationId,
            role: auth.role,
          },
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
        if (error instanceof ToolInputError) {
          res.status(400).json({
            error: 'invalid_params',
            error_description: error.message,
            details: error.issues,
          });
          return;
        }
        if (error instanceof RequestAuthError) {
          res.status(error.status).json({
            error: error.code,
            error_description: error.message,
          });
          return;
        }
        console.error(error instanceof Error ? error.message : 'MCP request failed');
        res.status(500).json({
          error: 'server_error',
          error_description: 'Internal server error',
        });
      }
    })();
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (res.headersSent) return;
    const parseError =
      err instanceof SyntaxError &&
      'status' in err &&
      (err as { status?: number }).status === 400;
    if (parseError) {
      res.status(400).json({
        error: 'invalid_request',
        error_description: 'Request body must be JSON.',
      });
      return;
    }
    console.error(err instanceof Error ? err.message : 'Unhandled error');
    res.status(500).json({
      error: 'server_error',
      error_description: 'Internal server error',
    });
  });

  return app;
}
