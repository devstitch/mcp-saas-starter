import Link from 'next/link';
import { pickPrimaryMembership, resolveUserMemberships } from '@mcp-saas-starter/auth';
import { listProjects, listTasks } from '@mcp-saas-starter/domain';
import type { McpAuditEvent, ProtectedAction } from '@mcp-saas-starter/database';
import { createClient } from '@/lib/supabase/server';
import { requireSession } from '@/lib/auth/session';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const memberships = user ? await resolveUserMemberships(supabase, user.id) : [];
  const primary = pickPrimaryMembership(memberships);

  let projectsCount = 0;
  let totalTasks = 0;
  let completedTasks = 0;
  let recentAuditEvents: McpAuditEvent[] = [];
  let pendingActionsCount = 0;

  if (user && primary) {
    try {
      const { client, userContext } = await requireSession();
      if (userContext) {
        const projects = await listProjects(client, userContext);
        projectsCount = projects.length;

        for (const project of projects) {
          const tasks = await listTasks(client, userContext, project.id);
          totalTasks += tasks.length;
          completedTasks += tasks.filter((t) => t.status === 'done').length;
        }

        const { data: auditData } = await client
          .from('mcp_audit_events')
          .select('*')
          .eq('organization_id', userContext.organizationId)
          .order('created_at', { ascending: false })
          .limit(5);
        recentAuditEvents = (auditData ?? []) as McpAuditEvent[];

        const { count: pendingCount } = await client
          .from('protected_actions')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', userContext.organizationId)
          .eq('status', 'pending');
        pendingActionsCount = pendingCount ?? 0;
      }
    } catch {
      // Fallback if session/context isn't ready
    }
  }

  const completionPercentage =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="fade-in space-y-8">
      {/* Page Title & Breadcrumb header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Workspace Overview</h1>
          <p className="text-sm text-muted-foreground">
            Real-time status of your projects, tasks, and MCP agent operations
          </p>
        </div>
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <Link
            href="/dashboard/projects"
            className="btn-secondary text-xs"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            View Projects
          </Link>
          <Link
            href="/dashboard/agent-activity"
            className="btn-primary text-xs"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            Audit Trail
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Projects */}
        <div className="stat-card relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="stat-label">Active Projects</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-muted text-accent">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="stat-value">{projectsCount}</span>
            <span className="text-xs text-muted-foreground">In workspace</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="glow-dot bg-accent" />
            <span>Multi-tenant scoped</span>
          </div>
        </div>

        {/* Metric 2: Tasks */}
        <div className="stat-card relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="stat-label">Tasks Progress</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info-muted text-info">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="stat-value">{totalTasks}</span>
            <span className="text-xs font-semibold text-info">{completionPercentage}% done</span>
          </div>
          <div className="mt-3">
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${completionPercentage}%` }} />
            </div>
          </div>
        </div>

        {/* Metric 3: MCP Agent Invocations */}
        <div className="stat-card relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="stat-label">Agent Invocations</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success-muted text-success">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="stat-value">{recentAuditEvents.length > 0 ? recentAuditEvents.length : 0}</span>
            <span className="text-xs text-muted-foreground">Logged calls</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-success">
            <span className="glow-dot bg-success" />
            <span>Audit pipeline active</span>
          </div>
        </div>

        {/* Metric 4: Pending Approvals */}
        <div className="stat-card relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="stat-label">Pending Approvals</span>
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${pendingActionsCount > 0 ? 'bg-danger-muted text-danger' : 'bg-surface-elevated text-muted'}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="stat-value">{pendingActionsCount}</span>
            {pendingActionsCount > 0 ? (
              <span className="badge badge-danger">Action required</span>
            ) : (
              <span className="badge badge-success">All Clear</span>
            )}
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            {pendingActionsCount > 0 ? (
              <Link href="/dashboard/approvals" className="text-danger hover:underline font-medium">
                Review {pendingActionsCount} requests &rarr;
              </Link>
            ) : (
              <span>No blocked operations</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Two-Column Dashboard Content */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Quick Features & Architecture (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          {/* Quick Access Navigation Cards */}
          <div className="glass-card p-6">
            <h2 className="text-sm font-semibold tracking-tight uppercase text-muted mb-4">
              Quick Workspace Portals
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href="/dashboard/projects"
                className="group flex flex-col justify-between rounded-xl border border-border/80 bg-surface/50 p-4 transition-all hover:border-accent/40 hover:bg-surface-hover"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-muted text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors">
                      Projects & Tasks
                    </h3>
                    <p className="text-xs text-muted-foreground">Hierarchical project boards</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted">
                  <span>{projectsCount} active projects</span>
                  <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                </div>
              </Link>

              <Link
                href="/dashboard/approvals"
                className="group flex flex-col justify-between rounded-xl border border-border/80 bg-surface/50 p-4 transition-all hover:border-pending/40 hover:bg-surface-hover"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pending-muted text-pending transition-colors group-hover:bg-pending group-hover:text-white">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-pending transition-colors">
                      HITL Approvals
                    </h3>
                    <p className="text-xs text-muted-foreground">Human-in-the-loop review</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted">
                  <span>{pendingActionsCount} pending approval</span>
                  <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                </div>
              </Link>
            </div>
          </div>

          {/* MCP Server Capability Matrix */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold tracking-tight uppercase text-muted">
                Available MCP Agent Tools
              </h2>
              <span className="badge badge-accent">Protocol 2024-11-05</span>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between rounded-lg border border-border/60 bg-surface-elevated/40 px-3.5 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-semibold text-accent">list_projects</span>
                  <span className="text-xs text-muted-foreground">Lists projects in current organization</span>
                </div>
                <span className="badge badge-success text-[0.625rem]">Read-Only</span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border/60 bg-surface-elevated/40 px-3.5 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-semibold text-accent">create_task</span>
                  <span className="text-xs text-muted-foreground">Creates task under permitted project</span>
                </div>
                <span className="badge badge-info text-[0.625rem]">Write</span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border/60 bg-surface-elevated/40 px-3.5 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-semibold text-danger">delete_task</span>
                  <span className="text-xs text-muted-foreground">Protected action: Queued for Admin approval</span>
                </div>
                <span className="badge badge-danger text-[0.625rem]">Guarded HITL</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activity Feed (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          <div className="glass-card p-6 flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold tracking-tight uppercase text-muted">
                  Recent Agent Activity
                </h2>
                <Link
                  href="/dashboard/agent-activity"
                  className="text-xs text-accent hover:underline"
                >
                  View all &rarr;
                </Link>
              </div>

              {recentAuditEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-elevated text-muted mb-2">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                  </div>
                  <p className="text-xs text-muted-foreground">No recent tool invocations.</p>
                  <p className="text-[0.6875rem] text-muted mt-1">Connect Cursor or Claude to trigger tools</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentAuditEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-surface/40 p-3"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-elevated text-foreground">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-semibold text-foreground truncate">
                            {event.tool_name}
                          </p>
                          <p className="text-[0.6875rem] text-muted truncate">
                            {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {event.execution_time_ms ? ` · ${event.execution_time_ms}ms` : ''}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`badge text-[0.625rem] shrink-0 ${
                          event.result_status === 'success'
                            ? 'badge-success'
                            : event.result_status === 'pending'
                            ? 'badge-pending'
                            : 'badge-danger'
                        }`}
                      >
                        {event.result_status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick status bar at bottom of feed */}
            <div className="mt-6 rounded-lg border border-border/80 bg-surface-elevated/40 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Organization Context</span>
                <span className="font-medium text-foreground">{primary?.organizationName ?? 'Default'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
