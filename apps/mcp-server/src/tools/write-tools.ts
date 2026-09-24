import type { UserContext } from '@mcp-saas-starter/auth';
import type { AppSupabaseClient } from '@mcp-saas-starter/database';
import { assignTask, createTask, requestDeleteTask, updateTask } from '@mcp-saas-starter/domain';
import type { AuditSink } from '@mcp-saas-starter/audit';
import type { McpServer } from '@modelcontextprotocol/server';
import {
  assignTaskInput,
  createTaskInput,
  deleteTaskInput,
  updateTaskInput,
} from '@mcp-saas-starter/shared';
import { runAudited } from './run-audited.js';

export type WriteToolDeps = {
  client: AppSupabaseClient;
  userContext: UserContext;
  audit: AuditSink;
};

export function registerWriteTools(server: McpServer, deps: WriteToolDeps): void {
  const { client, userContext, audit } = deps;

  server.registerTool(
    'create_task',
    {
      description: 'Create a task in a project belonging to the signed-in organization.',
      inputSchema: createTaskInput,
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async (args) =>
      runAudited({
        sink: audit,
        toolName: 'create_task',
        actionType: 'tool',
        input: args,
        work: () =>
          createTask(client, userContext, {
            projectId: args.projectId,
            title: args.title,
            description: args.description,
            assigneeId: args.assigneeId,
          }),
      }),
  );

  server.registerTool(
    'update_task',
    {
      description: 'Update a task in the signed-in organization.',
      inputSchema: updateTaskInput,
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async (args) =>
      runAudited({
        sink: audit,
        toolName: 'update_task',
        actionType: 'tool',
        input: {
          taskId: args.taskId,
          title: args.title,
          status: args.status,
          assigneeId: args.assigneeId,
        },
        work: () =>
          updateTask(client, userContext, args.taskId, {
            title: args.title,
            description: args.description,
            status: args.status,
            assigneeId: args.assigneeId,
          }),
      }),
  );

  server.registerTool(
    'assign_task',
    {
      description: 'Assign a task to a member of the signed-in organization.',
      inputSchema: assignTaskInput,
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async (args) =>
      runAudited({
        sink: audit,
        toolName: 'assign_task',
        actionType: 'tool',
        input: args,
        work: () => assignTask(client, userContext, args.taskId, args.assigneeId),
      }),
  );

  server.registerTool(
    'delete_task',
    {
      description:
        'Request deletion of a task in the signed-in organization. Does not delete the task. An admin must approve the pending action.',
      inputSchema: deleteTaskInput,
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async (args) =>
      runAudited({
        sink: audit,
        toolName: 'delete_task',
        actionType: 'tool',
        input: args,
        work: async () => {
          const action = await requestDeleteTask(client, userContext, args.taskId);
          return {
            status: 'pending_approval' as const,
            message: 'Pending approval. The task was not deleted.',
            protectedActionId: action.id,
            taskId: args.taskId,
          };
        },
      }),
  );
}
