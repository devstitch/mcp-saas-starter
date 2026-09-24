import type { UserContext } from '@mcp-saas-starter/auth';
import { authorize } from '@mcp-saas-starter/authorization';
import type { AppSupabaseClient } from '@mcp-saas-starter/database';
import { NotFoundError } from './errors.js';

export type OrganizationContext = {
  id: string;
  name: string;
  memberCount: number;
  projectCount: number;
};

/**
 * Safe context for organization://current. Counts only — no member emails or other orgs.
 */
export async function getCurrentOrganization(
  client: AppSupabaseClient,
  userContext: UserContext,
): Promise<OrganizationContext> {
  authorize(userContext, 'project:view');

  const { data: organization, error } = await client
    .from('organizations')
    .select('id, name')
    .eq('id', userContext.organizationId)
    .maybeSingle();

  if (error) {
    throw new Error(`getCurrentOrganization failed: ${error.message}`);
  }
  if (!organization) {
    throw new NotFoundError('Organization not found.');
  }

  const { count: memberCount, error: memberError } = await client
    .from('memberships')
    .select('user_id', { count: 'exact', head: true })
    .eq('organization_id', userContext.organizationId);

  if (memberError) {
    throw new Error(`getCurrentOrganization member count failed: ${memberError.message}`);
  }

  const { count: projectCount, error: projectError } = await client
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', userContext.organizationId);

  if (projectError) {
    throw new Error(`getCurrentOrganization project count failed: ${projectError.message}`);
  }

  return {
    id: organization.id,
    name: organization.name,
    memberCount: memberCount ?? 0,
    projectCount: projectCount ?? 0,
  };
}
