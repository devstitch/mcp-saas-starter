import type { UserContext } from '@mcp-saas-starter/auth';
import { authorize } from '@mcp-saas-starter/authorization';
import { isPermittedStatusTransition } from '@mcp-saas-starter/shared';
import type { AppSupabaseClient, Task } from '@mcp-saas-starter/database';
import type { CreateTaskInput, UpdateTaskInput } from './access.js';
import { NotFoundError, ValidationError } from './errors.js';
import { requireProject } from './projects.js';

async function assertAssigneeInOrganization(
  client: AppSupabaseClient,
  organizationId: string,
  assigneeId: string,
): Promise<void> {
  const { data, error } = await client
    .from('memberships')
    .select('user_id')
    .eq('organization_id', organizationId)
    .eq('user_id', assigneeId)
    .maybeSingle();

  if (error) {
    throw new Error(`assignee membership lookup failed: ${error.message}`);
  }
  if (!data) {
    throw new ValidationError('Assignee must be a member of the same organization.');
  }
}

export async function listTasks(
  client: AppSupabaseClient,
  userContext: UserContext,
  projectId: string,
): Promise<Task[]> {
  authorize(userContext, 'task:view');
  await requireProject(client, userContext, projectId);

  const { data, error } = await client
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .eq('organization_id', userContext.organizationId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`listTasks failed: ${error.message}`);
  }

  return data ?? [];
}

export async function getTask(
  client: AppSupabaseClient,
  userContext: UserContext,
  taskId: string,
): Promise<Task | null> {
  authorize(userContext, 'task:view');

  const { data, error } = await client
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .eq('organization_id', userContext.organizationId)
    .maybeSingle();

  if (error) {
    throw new Error(`getTask failed: ${error.message}`);
  }

  if (data) {
    authorize(userContext, 'task:view', { organizationId: data.organization_id });
  }

  return data;
}

export async function requireTask(
  client: AppSupabaseClient,
  userContext: UserContext,
  taskId: string,
): Promise<Task> {
  const task = await getTask(client, userContext, taskId);
  if (!task) {
    throw new NotFoundError('Task not found.');
  }
  return task;
}

export async function createTask(
  client: AppSupabaseClient,
  userContext: UserContext,
  input: CreateTaskInput,
): Promise<Task> {
  authorize(userContext, 'task:create');

  const title = input.title.trim();
  if (!title) {
    throw new ValidationError('Task title is required.');
  }

  await requireProject(client, userContext, input.projectId);

  if (input.assigneeId) {
    await assertAssigneeInOrganization(
      client,
      userContext.organizationId,
      input.assigneeId,
    );
  }

  const { data, error } = await client
    .from('tasks')
    .insert({
      project_id: input.projectId,
      organization_id: userContext.organizationId,
      title,
      description: input.description ?? null,
      assignee_id: input.assigneeId ?? null,
      created_by: userContext.userId,
      status: 'todo',
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`createTask failed: ${error?.message ?? 'unknown error'}`);
  }

  return data;
}

export async function updateTask(
  client: AppSupabaseClient,
  userContext: UserContext,
  taskId: string,
  input: UpdateTaskInput,
): Promise<Task> {
  authorize(userContext, 'task:update');
  const existing = await requireTask(client, userContext, taskId);
  authorize(userContext, 'task:update', { organizationId: existing.organization_id });

  if (input.assigneeId) {
    await assertAssigneeInOrganization(
      client,
      userContext.organizationId,
      input.assigneeId,
    );
  }

  if (input.title !== undefined && !input.title.trim()) {
    throw new ValidationError('Task title cannot be empty.');
  }

  const patch: {
    title?: string;
    description?: string | null;
    status?: UpdateTaskInput['status'];
    assignee_id?: string | null;
  } = {};

  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.description !== undefined) patch.description = input.description;
  if (input.status !== undefined) {
    if (!isPermittedStatusTransition(existing.status, input.status)) {
      throw new ValidationError(
        `Cannot change status from ${existing.status} to ${input.status}.`,
      );
    }
    patch.status = input.status;
  }
  if (input.assigneeId !== undefined) patch.assignee_id = input.assigneeId;

  if (Object.keys(patch).length === 0) {
    throw new ValidationError('No task fields to update.');
  }

  const { data, error } = await client
    .from('tasks')
    .update(patch)
    .eq('id', taskId)
    .eq('organization_id', userContext.organizationId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`updateTask failed: ${error?.message ?? 'unknown error'}`);
  }

  return data;
}

export async function assignTask(
  client: AppSupabaseClient,
  userContext: UserContext,
  taskId: string,
  assigneeId: string,
): Promise<Task> {
  authorize(userContext, 'task:assign');

  if (!assigneeId) {
    throw new ValidationError('assigneeId is required.');
  }

  const existing = await requireTask(client, userContext, taskId);
  authorize(userContext, 'task:assign', { organizationId: existing.organization_id });
  await assertAssigneeInOrganization(client, userContext.organizationId, assigneeId);

  const { data, error } = await client
    .from('tasks')
    .update({ assignee_id: assigneeId })
    .eq('id', taskId)
    .eq('organization_id', userContext.organizationId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`assignTask failed: ${error?.message ?? 'unknown error'}`);
  }

  return data;
}
