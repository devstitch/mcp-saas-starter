import type { Request } from 'express';

/**
 * No-op placeholder — later prompts will call
 * `authorize` from `@mcp-saas-starter/authorization`.
 */
export async function authorize(_req: Request): Promise<void> {
  void _req;
}
