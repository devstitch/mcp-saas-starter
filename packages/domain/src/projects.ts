import type { UserContext } from '@mcp-saas-starter/auth';
import { authorize } from '@mcp-saas-starter/authorization';
import type { AppSupabaseClient, Project } from '@mcp-saas-starter/database';
import { NotFoundError } from './errors.js';

export async function listProjects(
  client: AppSupabaseClient,
  userContext: UserContext,
): Promise<Project[]> {
  authorize(userContext, 'project:view');

  const { data, error } = await client
    .from('projects')
    .select('*')
    .eq('organization_id', userContext.organizationId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`listProjects failed: ${error.message}`);
  }

  return data ?? [];
}

export async function getProject(
  client: AppSupabaseClient,
  userContext: UserContext,
  projectId: string,
): Promise<Project | null> {
  authorize(userContext, 'project:view');

  const { data, error } = await client
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('organization_id', userContext.organizationId)
    .maybeSingle();

  if (error) {
    throw new Error(`getProject failed: ${error.message}`);
  }

  if (data) {
    authorize(userContext, 'project:view', { organizationId: data.organization_id });
  }

  return data;
}

export async function requireProject(
  client: AppSupabaseClient,
  userContext: UserContext,
  projectId: string,
): Promise<Project> {
  const project = await getProject(client, userContext, projectId);
  if (!project) {
    throw new NotFoundError('Project not found.');
  }
  return project;
}
