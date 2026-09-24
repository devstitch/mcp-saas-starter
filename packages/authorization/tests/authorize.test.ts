import { describe, expect, it } from 'vitest';
import type { UserContext } from '@mcp-saas-starter/auth';
import type { MembershipRole } from '@mcp-saas-starter/database';
import {
  AUTHORIZATION_ACTIONS,
  AuthorizationError,
  authorize,
  canPerform,
  type AuthorizationAction,
} from '../src/index.js';

const ORG_A = '11111111-1111-1111-1111-111111111111';
const ORG_B = '22222222-2222-2222-2222-222222222222';

function user(role: MembershipRole, organizationId = ORG_A): UserContext {
  return {
    userId: '00000000-0000-0000-0000-000000000001',
    organizationId,
    role,
  };
}

const EXPECTED: Record<MembershipRole, Record<AuthorizationAction, boolean>> = {
  viewer: {
    'project:view': true,
    'project:create': false,
    'project:update': false,
    'task:view': true,
    'task:create': false,
    'task:update': false,
    'task:assign': false,
    'task:delete': false,
    'protected_action:approve': false,
  },
  member: {
    'project:view': true,
    'project:create': false,
    'project:update': false,
    'task:view': true,
    'task:create': true,
    'task:update': true,
    'task:assign': true,
    'task:delete': false,
    'protected_action:approve': false,
  },
  admin: {
    'project:view': true,
    'project:create': true,
    'project:update': true,
    'task:view': true,
    'task:create': true,
    'task:update': true,
    'task:assign': true,
    'task:delete': true,
    'protected_action:approve': true,
  },
};

describe('authorize role × action matrix', () => {
  const roles: MembershipRole[] = ['viewer', 'member', 'admin'];

  for (const role of roles) {
    for (const action of AUTHORIZATION_ACTIONS) {
      const allowed = EXPECTED[role][action];

      it(`${role} ${allowed ? 'can' : 'cannot'} ${action}`, () => {
        expect(canPerform(role, action)).toBe(allowed);

        if (allowed) {
          expect(authorize(user(role), action)).toBe(true);
        } else {
          expect(() => authorize(user(role), action)).toThrow(AuthorizationError);
        }
      });
    }
  }
});

describe('PRD denial cases', () => {
  it('viewer attempts write (task:create) → denied', () => {
    expect(() => authorize(user('viewer'), 'task:create')).toThrow(AuthorizationError);
  });

  it('member attempts delete (task:delete) → denied', () => {
    expect(() => authorize(user('member'), 'task:delete')).toThrow(AuthorizationError);
  });
});

describe('tenant resource check', () => {
  it('denies when resource.organizationId does not match user context', () => {
    expect(() =>
      authorize(user('admin', ORG_A), 'project:view', { organizationId: ORG_B }),
    ).toThrow(AuthorizationError);
  });

  it('allows when resource.organizationId matches user context', () => {
    expect(authorize(user('admin', ORG_A), 'project:view', { organizationId: ORG_A })).toBe(true);
  });
});
