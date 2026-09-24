import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, MembershipRole } from '@mcp-saas-starter/database';

/**
 * Active tenant context used by domain services and (later) the MCP server.
 * organizationId always comes from membership — never from a client-supplied spoof.
 */
export type UserContext = {
  userId: string;
  organizationId: string;
  role: MembershipRole;
};

export type UserMembership = {
  organizationId: string;
  organizationName: string;
  role: MembershipRole;
};

export type ResolvedAuthUser = {
  userId: string;
  email: string | null;
  memberships: UserMembership[];
};

type MembershipRow = {
  organization_id: string;
  role: MembershipRole;
  organizations: { name: string } | { name: string }[] | null;
};

/**
 * Resolve all org memberships + roles for a user.
 * Reusable from the web app and the MCP authenticate middleware.
 */
export async function resolveUserMemberships(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<UserMembership[]> {
  const { data, error } = await client
    .from('memberships')
    .select('organization_id, role, organizations(name)')
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to resolve memberships: ${error.message}`);
  }

  return ((data ?? []) as MembershipRow[]).map((row) => {
    const org = Array.isArray(row.organizations) ? row.organizations[0] : row.organizations;

    return {
      organizationId: row.organization_id,
      organizationName: org?.name ?? 'Unknown organization',
      role: row.role,
    };
  });
}

/**
 * Pick a single active membership for V1 (one-org-at-a-time UX).
 * Prefers an admin membership when present.
 */
export function pickPrimaryMembership(memberships: UserMembership[]): UserMembership | null {
  if (memberships.length === 0) return null;
  return memberships.find((m) => m.role === 'admin') ?? memberships[0] ?? null;
}

export function toUserContext(userId: string, membership: UserMembership): UserContext {
  return {
    userId,
    organizationId: membership.organizationId,
    role: membership.role,
  };
}

/**
 * Convenience: load memberships and return a primary UserContext.
 */
export async function resolveUserContext(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<UserContext | null> {
  const memberships = await resolveUserMemberships(client, userId);
  const primary = pickPrimaryMembership(memberships);
  if (!primary) return null;
  return toUserContext(userId, primary);
}
