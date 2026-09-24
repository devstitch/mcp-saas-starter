export const PACKAGE_NAME = '@mcp-saas-starter/audit' as const;

export { captureAudit, createAuditSink, isDeniedError, summarizeInput } from './capture.js';
export type { AuditDraft, AuditSink } from './capture.js';
