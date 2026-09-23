import type { UserContext } from '@mcp-saas-starter/auth';
import { authorize } from '@mcp-saas-starter/authorization';
import type { AppSupabaseClient, ProtectedAction } from '@mcp-saas-starter/database';
import { NotFoundError, ValidationError } from './errors.js';
import { requireTask } from './tasks.js';

/**
 * Does NOT delete the task. Creates a pending protected_action for admin approval.
 */
export async function requestDeleteTask(
  client: AppSupabaseClient,
  userContext: UserContext,
  taskId: string,
): Promise<ProtectedAction> {
  authorize(userContext, 'task:delete');
  const task = await requireTask(client, userContext, taskId);
  authorize(userContext, 'task:delete', { organizationId: task.organization_id });

  const { data, error } = await client
    .from('protected_actions')
    .insert({
      organization_id: userContext.organizationId,
      requested_by: userContext.userId,
      tool_name: 'delete_task',
      payload: {
        taskId: task.id,
        projectId: task.project_id,
        title: task.title,
      },
      status: 'pending',
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`requestDeleteTask failed: ${error?.message ?? 'unknown error'}`);
  }

  return data;
}

/**
 * Admin resolves a pending protected action.
 * On approve: deletes the task using the service-role client (RLS blocks user DELETE).
 * On reject: marks rejected only.
 */
export async function resolveProtectedAction(
  userClient: AppSupabaseClient,
  serviceClient: AppSupabaseClient,
  adminContext: UserContext,
  protectedActionId: string,
  decision: 'approved' | 'rejected',
): Promise<void> {
  authorize(adminContext, 'protected_action:approve');

  if (decision !== 'approved' && decision !== 'rejected') {
    throw new ValidationError('decision must be approved or rejected.');
  }

  const { data: action, error } = await userClient
    .from('protected_actions')
    .select('*')
    .eq('id', protectedActionId)
    .eq('organization_id', adminContext.organizationId)
    .maybeSingle();

  if (error) {
    throw new Error(`resolveProtectedAction lookup failed: ${error.message}`);
  }
  if (!action) {
    throw new NotFoundError('Protected action not found.');
  }
  if (action.status !== 'pending') {
    throw new ValidationError('Protected action is already resolved.');
  }

  authorize(adminContext, 'protected_action:approve', {
    organizationId: action.organization_id,
  });

  const resolvedAt = new Date().toISOString();

  if (decision === 'approved') {
    const payload = action.payload as { taskId?: string };
    const taskId = payload.taskId;
    if (!taskId) {
      throw new ValidationError('Protected action payload is missing taskId.');
    }

    const { error: deleteError } = await serviceClient
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('organization_id', adminContext.organizationId);

    if (deleteError) {
      throw new Error(`Task delete failed: ${deleteError.message}`);
    }
  }

  const { error: updateError } = await userClient
    .from('protected_actions')
    .update({
      status: decision,
      approved_by: adminContext.userId,
      resolved_at: resolvedAt,
    })
    .eq('id', protectedActionId)
    .eq('organization_id', adminContext.organizationId);

  if (updateError) {
    throw new Error(`resolveProtectedAction update failed: ${updateError.message}`);
  }
}
