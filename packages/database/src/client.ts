import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types.js';

export type AppSupabaseClient = SupabaseClient<Database>;

export type CreateSupabaseClientOptions = {
  /**
   * User access token sent as Authorization so Postgres RLS sees auth.uid().
   * The key argument stays the publishable (or secret) API key.
   */
  accessToken?: string;
};

/**
 * Create a typed Supabase client. Callers must pass explicit URL + key
 * (no env lookups inside this package).
 */
export function createSupabaseClient(
  url: string,
  key: string,
  options?: CreateSupabaseClientOptions,
): AppSupabaseClient {
  if (!url) {
    throw new Error('createSupabaseClient: url is required');
  }
  if (!key) {
    throw new Error('createSupabaseClient: key is required');
  }

  const accessToken = options?.accessToken?.trim();

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });
}
