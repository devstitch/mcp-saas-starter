import type { UserContext } from '@mcp-saas-starter/auth';
import type { AppSupabaseClient } from '@mcp-saas-starter/database';
import {
  NotFoundError,
  getProject,
  getTask,
  listProjects,
  listTasks,
} from '@mcp-saas-starter/domain';
import type { AuditSink } from '@mcp-saas-starter/audit';
import type { McpServer } from '@modelcontextprotocol/server';
import {
  getProjectInput,
  getTaskInput,
  listProjectsInput,
  listTasksInput,
} from '@mcp-saas-starter/shared';
import { runAudited } from './run-audited.js';

export type ReadToolDeps = {
  client: AppSupabaseClient;
  userContext: UserContext;
  audit: AuditSink;
};

const NOT_PERMITTED = 'Not found or not permitted.';

/** Read-only tools. Handlers call domain services and do not query or authorize themselves. */
export function registerReadTools(server: McpServer, deps: ReadToolDeps): void {
  const { client, userContext, audit } = deps;

  server.registerTool(
    'list_projects',
    {
      description: 'List projects in the signed-in user organization.',
      inputSchema: listProjectsInput,
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async (args) =>
      runAudited({
        sink: audit,
        toolName: 'list_projects',
        actionType: 'tool',
        input: args,
        work: async () => {
          const projects = await listProjects(client, userContext);
          return args.limit === undefined ? projects : projects.slice(0, args.limit);
        },
      }),
  );

  server.registerTool(
    'get_project',
    {
      description: 'Get one project in the signed-in user organization.',
      inputSchema: getProjectInput,
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async (args) =>
      runAudited({
        sink: audit,
        toolName: 'get_project',
        actionType: 'tool',
        input: args,
        work: async () => {
          const project = await getProject(client, userContext, args.projectId);
          if (!project) throw new NotFoundError(NOT_PERMITTED);
          return project;
        },
      }),
  );

  server.registerTool(
    'list_tasks',
    {
      description: 'List tasks for one project in the signed-in user organization.',
      inputSchema: listTasksInput,
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async (args) =>
      runAudited({
        sink: audit,
        toolName: 'list_tasks',
        actionType: 'tool',
        input: args,
        work: async () => {
          const tasks = await listTasks(client, userContext, args.projectId);
          return args.status === undefined
            ? tasks
            : tasks.filter((task) => task.status === args.status);
        },
      }),
  );

  server.registerTool(
    'get_task',
    {
      description: 'Get one task in the signed-in user organization.',
      inputSchema: getTaskInput,
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async (args) =>
      runAudited({
        sink: audit,
        toolName: 'get_task',
        actionType: 'tool',
        input: args,
        work: async () => {
          const task = await getTask(client, userContext, args.taskId);
          if (!task) throw new NotFoundError(NOT_PERMITTED);
          return task;
        },
      }),
  );
}
