import { redirect } from 'next/navigation';
import { pickPrimaryMembership, resolveUserMemberships } from '@mcp-saas-starter/auth';
import { createClient } from '@/lib/supabase/server';
import { DashboardSidebar } from './dashboard-sidebar';

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

  let pendingCount = 0;
  if (primary?.organizationId) {
    const { count } = await supabase
      .from('protected_actions')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', primary.organizationId)
      .eq('status', 'pending');
    pendingCount = count ?? 0;
  }

  return (
    <div className="min-h-screen bg-background text-foreground md:flex">
      {/* Sidebar Navigation */}
      <DashboardSidebar
        userEmail={user.email ?? ''}
        organizationName={primary?.organizationName}
        role={primary?.role}
        pendingApprovalsCount={pendingCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header / Breadcrumbs Bar */}
        <header className="hidden md:flex h-14 items-center justify-between border-b border-border/80 bg-surface/20 px-8 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{primary?.organizationName ?? 'Workspace'}</span>
            <span>/</span>
            <span className="capitalize">{primary?.role ?? 'Member'} Area</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Status Indicator */}
            <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs">
              <span className="glow-dot bg-success" />
              <span className="text-[0.6875rem] font-medium text-muted-foreground">
                MCP Server: <span className="text-foreground">Online</span>
              </span>
            </div>

            {/* Quick link badge for pending items if any */}
            {pendingCount > 0 && (
              <span className="flex items-center gap-1.5 rounded-full border border-danger/30 bg-danger-muted px-2.5 py-0.5 text-[0.6875rem] font-medium text-danger">
                <span className="h-1.5 w-1.5 rounded-full bg-danger animate-pulse" />
                {pendingCount} Pending Review
              </span>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
