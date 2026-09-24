import type { UserContext } from '@mcp-saas-starter/auth';
import type { AppSupabaseClient } from '@mcp-saas-starter/database';
import { captureAudit, type AuditSink } from '@mcp-saas-starter/audit';
import { getCurrentOrganization, getProjectContext } from '@mcp-saas-starter/domain';
import { McpServer, ResourceNotFoundError, ResourceTemplate } from '@modelcontextprotocol/server';
import { toolErrorText } from '../server/errors.js';

export type ResourceDeps = {
  client: AppSupabaseClient;
  userContext: UserContext;
  audit: AuditSink;
};

function jsonContents(uri: string, value: unknown) {
  return {
    contents: [
      {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(value),
      },
    ],
  };
}

function asClientFailure(error: unknown): never {
  const message = toolErrorText(error);
  if (message === 'Not found or not permitted.') {
    throw new ResourceNotFoundError(message);
  }
  throw new Error(message);
}

/** Resources. Handlers call domain services and do not authorize themselves. */
export function registerResources(server: McpServer, deps: ResourceDeps): void {
  const { client, userContext, audit } = deps;

  server.registerResource(
    'project',
    new ResourceTemplate('project://{projectId}', { list: undefined }),
    {
      description:
        'Project name, description, status, and task count for a project in the signed-in organization.',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const projectId = variables.projectId;
      if (typeof projectId !== 'string' || projectId.length === 0) {
        throw new ResourceNotFoundError('Not found or not permitted.');
      }
      try {
        const project = await captureAudit({
          sink: audit,
          toolName: 'project',
          actionType: 'resource',
          input: { projectId, uri: uri.toString() },
          work: () => getProjectContext(client, userContext, projectId),
        });
        return jsonContents(uri.toString(), project);
      } catch (error) {
        asClientFailure(error);
      }
    },
  );

  server.registerResource(
    'organization',
    'organization://current',
    {
      description:
        'Name, member count, and project count for the signed-in organization. No member details.',
      mimeType: 'application/json',
    },
    async (uri) => {
      try {
        const organization = await captureAudit({
          sink: audit,
          toolName: 'organization',
          actionType: 'resource',
          input: { uri: uri.toString() },
          work: () => getCurrentOrganization(client, userContext),
        });
        return jsonContents(uri.toString(), organization);
      } catch (error) {
        asClientFailure(error);
      }
    },
  );
}
