import type { UserContext } from '@mcp-saas-starter/auth';
import type { AppSupabaseClient } from '@mcp-saas-starter/database';
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
  assignTask,
  createTask,
  updateTask,
} from '@mcp-saas-starter/domain';
import type { McpServer } from '@modelcontextprotocol/server';
import { assignTaskInput, createTaskInput, updateTaskInput } from '@mcp-saas-starter/shared';

export type WriteToolDeps = {
  client: AppSupabaseClient;
  userContext: UserContext;
};

const NOT_PERMITTED = 'Not found or not permitted.';

function jsonResult(value: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(value) }],
  };
}

function errorResult(message: string) {
  return {
    isError: true as const,
    content: [{ type: 'text' as const, text: message }],
  };
}

async function runWrite<T>(work: () => Promise<T>) {
  try {
    return jsonResult(await work());
  } catch (error) {
    if (error instanceof NotFoundError) {
      return errorResult(NOT_PERMITTED);
    }
    if (error instanceof AuthorizationError || error instanceof ValidationError) {
      return errorResult(error.message);
    }
    console.error(error instanceof Error ? error.message : 'Write tool failed');
    return errorResult('The tool could not be completed.');
  }
}

/** Write tools. Handlers call domain services and do not query or authorize themselves. */
export function registerWriteTools(server: McpServer, deps: WriteToolDeps): void {
  const { client, userContext } = deps;

  server.registerTool(
    'create_task',
    {
      description: 'Create a task in a project belonging to the signed-in organization.',
      inputSchema: createTaskInput,
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async (args) =>
      runWrite(() =>
        createTask(client, userContext, {
          projectId: args.projectId,
          title: args.title,
          description: args.description,
          assigneeId: args.assigneeId,
        }),
      ),
  );

  server.registerTool(
    'update_task',
    {
      description: 'Update a task in the signed-in organization.',
      inputSchema: updateTaskInput,
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async (args) =>
      runWrite(() =>
        updateTask(client, userContext, args.taskId, {
          title: args.title,
          description: args.description,
          status: args.status,
          assigneeId: args.assigneeId,
        }),
      ),
  );

  server.registerTool(
    'assign_task',
    {
      description: 'Assign a task to a member of the signed-in organization.',
      inputSchema: assignTaskInput,
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async (args) =>
      runWrite(() => assignTask(client, userContext, args.taskId, args.assigneeId)),
  );
}
