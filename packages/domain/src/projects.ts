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

export type ProjectContext = {
  id: string;
  name: string;
  description: string | null;
  status: Project['status'];
  taskCount: number;
};

/**
 * Project context for the project:// resource. Same view permission as getProject.
 */
export async function getProjectContext(
  client: AppSupabaseClient,
  userContext: UserContext,
  projectId: string,
): Promise<ProjectContext> {
  const project = await requireProject(client, userContext, projectId);

  const { count, error } = await client
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', project.id)
    .eq('organization_id', userContext.organizationId);

  if (error) {
    throw new Error(`getProjectContext failed: ${error.message}`);
  }

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    taskCount: count ?? 0,
  };
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
