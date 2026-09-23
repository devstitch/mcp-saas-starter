export const PACKAGE_NAME = '@mcp-saas-starter/database' as const;

export { createSupabaseClient } from './client.js';
export type { AppSupabaseClient, CreateSupabaseClientOptions } from './client.js';

export type {
  Database,
  Json,
  Membership,
  MembershipInsert,
  MembershipRole,
  McpAuditEvent,
  McpAuditEventInsert,
  McpAuditResultStatus,
  Organization,
  OrganizationInsert,
  Project,
  ProjectInsert,
  ProjectStatus,
  ProtectedAction,
  ProtectedActionInsert,
  ProtectedActionStatus,
  PublicTables,
  Task,
  TaskInsert,
  TaskStatus,
} from './types.js';
