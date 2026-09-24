import { createSupabaseClient } from '@mcp-saas-starter/database';
import type { AuditSink } from '@mcp-saas-starter/audit';
import type { Request } from 'express';
import { requireSupabaseSecretKey, requireSupabaseUrl } from '../env.js';

/**
 * Persist audit drafts collected while the tool or resource ran.
 * Inserts use the service role because RLS allows members to read, not write.
 */
export async function audit(req: Request): Promise<void> {
  const auth = req.mcpContext;
  const sink: AuditSink | undefined = req.mcpAudit;
  if (!auth || !sink || sink.events.length === 0) return;

  try {
    const client = createSupabaseClient(requireSupabaseUrl(), requireSupabaseSecretKey());
    const { error } = await client.from('mcp_audit_events').insert(
      sink.events.map((event) => ({
        organization_id: auth.organizationId,
        user_id: auth.userId,
        client_id: auth.clientId,
        tool_name: event.toolName,
        action_type: event.actionType,
        input_metadata: event.inputMetadata,
        result_status: event.resultStatus,
        execution_time_ms: event.executionTimeMs,
      })),
    );
    if (error) {
      console.error('audit write failed:', error.message);
    }
  } catch (error) {
    console.error('audit write failed:', error instanceof Error ? error.message : 'unknown error');
  }
}
