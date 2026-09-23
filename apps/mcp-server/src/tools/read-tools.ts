import type { UserContext } from '@mcp-saas-starter/auth';
import type { AppSupabaseClient } from '@mcp-saas-starter/database';
import {
  AuthorizationError,
  NotFoundError,
  getProject,
  getTask,
  listProjects,
  listTasks,
} from '@mcp-saas-starter/domain';
import type { McpServer } from '@modelcontextprotocol/server';
import {
  getProjectInput,
  getTaskInput,
  listProjectsInput,
  listTasksInput,
} from '@mcp-saas-starter/shared';

export type ReadToolDeps = {
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

async function runRead<T>(work: () => Promise<T>) {
  try {
    return jsonResult(await work());
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError) {
      return errorResult(NOT_PERMITTED);
    }
    console.error(error instanceof Error ? error.message : 'Read tool failed');
    return errorResult('The tool could not be completed.');
  }
}

/** Read-only tools. Handlers call domain services and do not query or authorize themselves. */
export function registerReadTools(server: McpServer, deps: ReadToolDeps): void {
  const { client, userContext } = deps;

  server.registerTool(
    'list_projects',
    {
      description: 'List projects in the signed-in user organization.',
      inputSchema: listProjectsInput,
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async (args) =>
      runRead(async () => {
        const projects = await listProjects(client, userContext);
        return args.limit === undefined ? projects : projects.slice(0, args.limit);
      }),
  );

  server.registerTool(
    'get_project',
    {
      description: 'Get one project in the signed-in user organization.',
      inputSchema: getProjectInput,
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async (args) => {
      try {
        const project = await getProject(client, userContext, args.projectId);
        if (!project) return errorResult(NOT_PERMITTED);
        return jsonResult(project);
      } catch (error) {
        if (error instanceof NotFoundError || error instanceof AuthorizationError) {
          return errorResult(NOT_PERMITTED);
        }
        console.error(error instanceof Error ? error.message : 'get_project failed');
        return errorResult('The tool could not be completed.');
      }
    },
  );

  server.registerTool(
    'list_tasks',
    {
      description: 'List tasks for one project in the signed-in user organization.',
      inputSchema: listTasksInput,
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async (args) =>
      runRead(async () => {
        const tasks = await listTasks(client, userContext, args.projectId);
        return args.status === undefined
          ? tasks
          : tasks.filter((task) => task.status === args.status);
      }),
  );

  server.registerTool(
    'get_task',
    {
      description: 'Get one task in the signed-in user organization.',
      inputSchema: getTaskInput,
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async (args) => {
      try {
        const task = await getTask(client, userContext, args.taskId);
        if (!task) return errorResult(NOT_PERMITTED);
        return jsonResult(task);
      } catch (error) {
        if (error instanceof NotFoundError || error instanceof AuthorizationError) {
          return errorResult(NOT_PERMITTED);
        }
        console.error(error instanceof Error ? error.message : 'get_task failed');
        return errorResult('The tool could not be completed.');
      }
    },
  );
}
