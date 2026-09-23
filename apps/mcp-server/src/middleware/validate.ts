import { ToolInputError, parseToolInput, type ParsedToolInput } from '@mcp-saas-starter/shared';
import type { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      mcpToolInput?: ParsedToolInput;
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validate tools/call arguments before authentication, authorization, or domain code.
 * Other MCP methods (initialize, tools/list) are left unchanged.
 */
export async function validate(req: Request): Promise<void> {
  if (!isRecord(req.body) || req.body.method !== 'tools/call') return;

  const params = isRecord(req.body.params) ? req.body.params : undefined;
  const name = params?.name;
  if (typeof name !== 'string' || name.length === 0) {
    throw new ToolInputError('tools/call', [
      { path: 'name', message: 'Tool name is required.' },
    ]);
  }

  if (params?.arguments !== undefined && !isRecord(params.arguments)) {
    throw new ToolInputError(name, [
      { path: 'arguments', message: 'Tool arguments must be an object.' },
    ]);
  }

  const parsed = parseToolInput(name, params?.arguments ?? {});
  req.mcpToolInput = parsed;
}
