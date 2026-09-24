import { captureAudit, type AuditSink } from '@mcp-saas-starter/audit';
import { toolErrorText } from '../server/errors.js';

export async function runAudited<T>(options: {
  sink: AuditSink;
  toolName: string;
  actionType: string;
  input: unknown;
  work: () => Promise<T>;
}) {
  try {
    const value = await captureAudit(options);
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(value) }],
    };
  } catch (error) {
    return {
      isError: true as const,
      content: [{ type: 'text' as const, text: toolErrorText(error) }],
    };
  }
}
