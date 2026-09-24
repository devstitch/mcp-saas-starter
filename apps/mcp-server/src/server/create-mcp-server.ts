import { McpServer } from '@modelcontextprotocol/server';
import { registerResources } from '../resources/index.js';
import { registerReadTools, registerWriteTools, type ReadToolDeps } from '../tools/index.js';

/**
 * Per-request MCP server. Tool handlers call `@mcp-saas-starter/domain`.
 */
export function createMcpServer(deps: ReadToolDeps): McpServer {
  const server = new McpServer(
    {
      name: 'mcp-saas-starter',
      version: '0.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
      instructions:
        'Tools and resources return and change only projects and tasks in the signed-in user organization. Handlers call packages/domain.',
    },
  );

  registerReadTools(server, deps);
  registerWriteTools(server, deps);
  registerResources(server, deps);
  return server;
}
