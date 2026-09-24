import type { UserContext } from '@mcp-saas-starter/auth';
import type { MembershipRole } from '@mcp-saas-starter/database';

export type AuthorizationAction =
  | 'project:view'
  | 'project:create'
  | 'project:update'
  | 'task:view'
  | 'task:create'
  | 'task:update'
  | 'task:assign'
  | 'task:delete'
  | 'protected_action:approve';

export type Resource = {
  organizationId: string;
};

export const AUTHORIZATION_ACTIONS: readonly AuthorizationAction[] = [
  'project:view',
  'project:create',
  'project:update',
  'task:view',
  'task:create',
  'task:update',
  'task:assign',
  'task:delete',
  'protected_action:approve',
] as const;

const ALL_ACTIONS = new Set<AuthorizationAction>(AUTHORIZATION_ACTIONS);

const ROLE_PERMISSIONS: Record<MembershipRole, ReadonlySet<AuthorizationAction>> = {
  viewer: new Set<AuthorizationAction>(['project:view', 'task:view']),
  member: new Set<AuthorizationAction>([
    'project:view',
    'task:view',
    'task:create',
    'task:update',
    'task:assign',
  ]),
  admin: ALL_ACTIONS,
};

export class AuthorizationError extends Error {
  readonly code = 'UNAUTHORIZED' as const;
  readonly action: string;
  readonly role: MembershipRole;

  constructor(user: UserContext, action: string, message?: string) {
    super(message ?? `Role "${user.role}" is not allowed to perform "${action}".`);
    this.name = 'AuthorizationError';
    this.action = action;
    this.role = user.role;
  }
}

export function permissionsForRole(role: MembershipRole): ReadonlySet<AuthorizationAction> {
  return ROLE_PERMISSIONS[role];
}

export function canPerform(role: MembershipRole, action: AuthorizationAction): boolean {
  return ROLE_PERMISSIONS[role].has(action);
}

/**
 * Authorize an action for the current user context.
 * Returns true on success; throws AuthorizationError on denial.
 * Never returns false.
 */
export function authorize(
  user: UserContext,
  action: AuthorizationAction,
  resource?: Resource,
): true {
  if (resource && resource.organizationId !== user.organizationId) {
    throw new AuthorizationError(user, action, 'Cross-tenant access is not allowed.');
  }

  if (!canPerform(user.role, action)) {
    throw new AuthorizationError(user, action);
  }

  return true;
}
