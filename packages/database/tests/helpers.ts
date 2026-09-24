import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../src/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

config({ path: path.join(repoRoot, '.env.local') });
config({ path: path.join(repoRoot, '.env') });

export type AppSupabaseClient = SupabaseClient<Database>;

export type TestUser = {
  id: string;
  accessToken: string;
  refreshToken: string;
};

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Set it in .env.local before running RLS tests.`);
  }
  return value;
}

export function createServiceClient(): AppSupabaseClient {
  return createClient<Database>(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SECRET_KEY'), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function createTestUser(
  service: AppSupabaseClient,
  email: string,
  password: string,
): Promise<TestUser> {
  const { data: created, error: createError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    throw new Error(`Failed to create user ${email}: ${createError?.message}`);
  }

  const publishable = createClient(
    requireEnv('SUPABASE_URL'),
    requireEnv('SUPABASE_PUBLISHABLE_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  const { data: session, error: signInError } = await publishable.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !session.session) {
    throw new Error(`Failed to sign in ${email}: ${signInError?.message}`);
  }

  return {
    id: created.user.id,
    accessToken: session.session.access_token,
    refreshToken: session.session.refresh_token,
  };
}

export async function deleteTestUser(service: AppSupabaseClient, userId: string) {
  await service.auth.admin.deleteUser(userId);
}

/** Authenticated client with a real session so auth.uid() works in RLS. */
export async function createAuthedClient(user: TestUser): Promise<AppSupabaseClient> {
  const client = createClient<Database>(
    requireEnv('SUPABASE_URL'),
    requireEnv('SUPABASE_PUBLISHABLE_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  const { error } = await client.auth.setSession({
    access_token: user.accessToken,
    refresh_token: user.refreshToken,
  });

  if (error) {
    throw new Error(`Failed to set session: ${error.message}`);
  }

  return client;
}

/** True when PostgREST reports an RLS / permission failure, or no row was returned. */
export function isDenied(
  error: { message?: string; code?: string } | null,
  data: unknown,
): boolean {
  if (error) {
    const message = (error.message ?? '').toLowerCase();
    return (
      message.includes('row-level security') ||
      message.includes('permission denied') ||
      message.includes('violates') ||
      error.code === '42501' ||
      error.code === 'PGRST301'
    );
  }

  if (data == null) return true;
  if (Array.isArray(data) && data.length === 0) return true;
  return false;
}
