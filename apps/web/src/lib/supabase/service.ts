import { createSupabaseClient } from '@mcp-saas-starter/database';
import { getSupabaseEnv } from '../env';

/**
 * Service-role client. Server-only: task deletes bypass RLS, which blocks
 * authenticated DELETE. Never import this from a Client Component.
 */
export function createServiceClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Missing required env var: SUPABASE_SECRET_KEY');
  }

  const { url } = getSupabaseEnv();
  return createSupabaseClient(url, secretKey);
}
