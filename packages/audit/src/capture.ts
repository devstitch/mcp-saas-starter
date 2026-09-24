import { AuthorizationError } from '@mcp-saas-starter/authorization';
import type { Json, McpAuditResultStatus } from '@mcp-saas-starter/database';
import { NotFoundError, UnauthorizedError } from '@mcp-saas-starter/shared';

const SUMMARY_KEYS = [
  'projectId',
  'taskId',
  'assigneeId',
  'status',
  'limit',
  'title',
  'uri',
] as const;

export type AuditDraft = {
  toolName: string;
  actionType: string;
  inputMetadata: Json;
  resultStatus: McpAuditResultStatus;
  executionTimeMs: number;
};

export type AuditSink = {
  events: AuditDraft[];
};

export function createAuditSink(): AuditSink {
  return { events: [] };
}

/** Keep ids and a short title. Drop descriptions and any other fields. */
export function summarizeInput(input: unknown): Json {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const source = input as Record<string, unknown>;
  const metadata: Record<string, Json> = {};
  for (const key of SUMMARY_KEYS) {
    const value = source[key];
    if (typeof value === 'number' && key === 'limit') {
      metadata[key] = value;
    } else if (typeof value === 'string') {
      metadata[key] = key === 'title' ? value.slice(0, 80) : value;
    }
  }
  return metadata;
}

export function isDeniedError(error: unknown): boolean {
  return (
    error instanceof AuthorizationError ||
    error instanceof NotFoundError ||
    error instanceof UnauthorizedError
  );
}

function isPendingResult(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    (value as { status?: unknown }).status === 'pending_approval'
  );
}

/**
 * Time one domain call and append an audit draft. Failures are recorded, then rethrown.
 */
export async function captureAudit<T>(options: {
  sink: AuditSink;
  toolName: string;
  actionType: string;
  input: unknown;
  work: () => Promise<T>;
}): Promise<T> {
  const started = Date.now();
  try {
    const value = await options.work();
    options.sink.events.push({
      toolName: options.toolName,
      actionType: options.actionType,
      inputMetadata: summarizeInput(options.input),
      resultStatus: isPendingResult(value) ? 'pending' : 'success',
      executionTimeMs: Date.now() - started,
    });
    return value;
  } catch (error) {
    options.sink.events.push({
      toolName: options.toolName,
      actionType: options.actionType,
      inputMetadata: summarizeInput(options.input),
      resultStatus: isDeniedError(error) ? 'denied' : 'error',
      executionTimeMs: Math.max(0, Date.now() - started),
    });
    throw error;
  }
}
