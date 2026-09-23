import Link from 'next/link';
import {
  pickPrimaryMembership,
  resolveUserMemberships,
} from '@mcp-saas-starter/auth';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const memberships = user ? await resolveUserMemberships(supabase, user.id) : [];
  const primary = pickPrimaryMembership(memberships);

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-neutral-600">
        Authenticated shell for the MCP SaaS starter. Product screens will fill in next.
      </p>

      {primary ? (
        <div className="rounded border border-neutral-200 bg-white p-4 text-sm">
          <p>
            <span className="text-neutral-500">Active org:</span> {primary.organizationName}
          </p>
          <p>
            <span className="text-neutral-500">Role:</span> {primary.role}
          </p>
          <p>
            <span className="text-neutral-500">Memberships:</span> {memberships.length}
          </p>
        </div>
      ) : (
        <p className="text-sm text-amber-700">
          Signed in, but no organization membership was found. Run <code>pnpm db:seed</code>.
        </p>
      )}

      <ul className="list-inside list-disc text-sm text-neutral-700">
        <li>
          <Link className="underline" href="/dashboard/projects">
            Projects
          </Link>{' '}
          — stub (wired to domain services in Prompt 6)
        </li>
        <li>
          <Link className="underline" href="/dashboard/agent-activity">
            Agent Activity
          </Link>{' '}
          — stub
        </li>
        <li>
          <Link className="underline" href="/dashboard/approvals">
            Pending Actions
          </Link>{' '}
          — stub
        </li>
      </ul>
    </main>
  );
}
