import Link from 'next/link';
import { redirect } from 'next/navigation';
import { pickPrimaryMembership, resolveUserMemberships } from '@mcp-saas-starter/auth';
import { createClient } from '@/lib/supabase/server';
import { signOutAction } from '@/app/login/actions';

const nav = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/projects', label: 'Projects' },
  { href: '/dashboard/agent-activity', label: 'Agent Activity' },
  { href: '/dashboard/approvals', label: 'Pending Actions' },
] as const;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const memberships = await resolveUserMemberships(supabase, user.id);
  const primary = pickPrimaryMembership(memberships);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">DevStitch</p>
            <p className="font-semibold">MCP SaaS Starter</p>
          </div>
          <div className="text-right text-sm">
            <p>{user.email}</p>
            <p className="text-neutral-500">
              {primary
                ? `${primary.organizationName} · ${primary.role}`
                : 'No organization membership'}
            </p>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-4 overflow-x-auto px-6 pb-3 text-sm">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-neutral-700 underline-offset-4 hover:underline"
            >
              {item.label}
            </Link>
          ))}
          <form action={signOutAction} className="ml-auto">
            <button type="submit" className="text-neutral-500 hover:text-neutral-900">
              Sign out
            </button>
          </form>
        </nav>
      </header>
      <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
    </div>
  );
}
