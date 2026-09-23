import { redirect } from 'next/navigation';
import {
  pickPrimaryMembership,
  resolveUserMemberships,
  toUserContext,
} from '@mcp-saas-starter/auth';
import type { UserContext } from '@mcp-saas-starter/auth';
import { createClient } from '@/lib/supabase/server';

export type SessionContext = {
  userId: string;
  email: string | null;
  userContext: UserContext | null;
  client: Awaited<ReturnType<typeof createClient>>;
};

/**
 * Resolve the signed-in session and optional primary tenant context.
 * Redirects to /login when unauthenticated.
 */
export async function requireSession(): Promise<SessionContext> {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const memberships = await resolveUserMemberships(client, user.id);
  const primary = pickPrimaryMembership(memberships);

  return {
    userId: user.id,
    email: user.email ?? null,
    userContext: primary ? toUserContext(user.id, primary) : null,
    client,
  };
}
