import Link from 'next/link';
import type { Json, McpAuditEvent } from '@mcp-saas-starter/database';
import { requireSession } from '@/lib/auth/session';
import { createServiceClient } from '@/lib/supabase/service';

const PAGE_SIZE = 20;

function pageNumber(value: string | undefined): number {
  const page = Number(value);
  if (!Number.isInteger(page) || page < 1) return 1;
  return page;
}

function affected(metadata: Json): string {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return '—';
  const title = typeof metadata.title === 'string' ? metadata.title : '';
  const taskId = typeof metadata.taskId === 'string' ? metadata.taskId : '';
  const projectId = typeof metadata.projectId === 'string' ? metadata.projectId : '';
  const uri = typeof metadata.uri === 'string' ? metadata.uri : '';
  return title || taskId || projectId || uri || '—';
}

async function userLabels(userIds: string[]): Promise<Map<string, string>> {
  const labels = new Map<string, string>();
  if (userIds.length === 0) return labels;
  const service = createServiceClient();
  await Promise.all(
    userIds.map(async (userId) => {
      const { data } = await service.auth.admin.getUserById(userId);
      labels.set(userId, data.user?.email ?? userId);
    }),
  );
  return labels;
}

function resultBadge(status: string) {
  switch (status) {
    case 'success':
      return 'badge-success';
    case 'error':
      return 'badge-danger';
    case 'denied':
      return 'badge-warning';
    case 'pending':
      return 'badge-pending';
    default:
      return 'badge-muted';
  }
}

function actionIcon(actionType: string) {
  if (actionType === 'resource') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-info shrink-0">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent shrink-0">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

export default async function AgentActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = pageNumber((await searchParams).page);
  const { client, userContext } = await requireSession();

  if (!userContext) {
    return (
      <div className="fade-in space-y-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Agent Activity</h1>
        <div className="alert alert-warning">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          No organization membership found. Run <code className="mx-1 font-mono text-xs">pnpm db:seed</code>.
        </div>
      </div>
    );
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data, count, error } = await client
    .from('mcp_audit_events')
    .select('*', { count: 'exact' })
    .eq('organization_id', userContext.organizationId)
    .order('created_at', { ascending: false })
    .range(from, to);

  const events = (data ?? []) as McpAuditEvent[];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const users = await userLabels([...new Set(events.map((event) => event.user_id))]);

  // Telemetry metrics
  const successCount = events.filter((e) => e.result_status === 'success').length;
  const successRate = events.length > 0 ? Math.round((successCount / events.length) * 100) : 100;

  return (
    <div className="fade-in space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Agent Audit Log</h1>
          <p className="text-sm text-muted-foreground">
            Complete telemetry of all MCP tool executions, resource reads, and security verifications
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-info">{total} Logged Events</span>
          <span className="badge badge-success">{successRate}% Success</span>
        </div>
      </div>

      {error ? (
        <div className="alert alert-danger" role="alert">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          Could not load agent activity records.
        </div>
      ) : null}

      {/* Main Dense Data Table */}
      {events.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-elevated text-muted mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <p className="text-base font-semibold text-foreground">No agent activity logged yet</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            When AI assistants like Claude Desktop or Cursor invoke MCP tools, records appear here automatically in real time.
          </p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-40">Timestamp</th>
                  <th>Actor / User</th>
                  <th>Tool / Action</th>
                  <th>Affected Entity</th>
                  <th>Status</th>
                  <th className="text-right">Latency</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="transition-colors hover:bg-surface-hover">
                    <td className="whitespace-nowrap">
                      <span className="font-mono text-xs text-foreground font-medium">
                        {new Date(event.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="ml-1.5 text-xs text-muted">
                        {new Date(event.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm text-foreground font-medium">
                        {users.get(event.user_id) ?? event.user_id}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {actionIcon(event.action_type)}
                        <span className="font-mono text-xs font-semibold text-foreground">{event.tool_name}</span>
                        <span className="text-[0.625rem] text-muted uppercase">({event.action_type})</span>
                      </div>
                    </td>
                    <td>
                      <span className="max-w-[200px] truncate font-mono text-xs text-muted-foreground block">
                        {affected(event.input_metadata)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${resultBadge(event.result_status)}`}>
                        {event.result_status}
                      </span>
                    </td>
                    <td className="text-right whitespace-nowrap font-mono text-xs">
                      {event.execution_time_ms === null ? (
                        <span className="text-muted">—</span>
                      ) : (
                        <span className="rounded bg-surface-elevated px-2 py-0.5 text-foreground font-medium">
                          {event.execution_time_ms} ms
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Footer */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-muted-foreground">
          Showing page <span className="font-semibold text-foreground">{page}</span> of <span className="font-semibold text-foreground">{pages}</span> ({total} total audit records)
        </p>
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Link href={`/dashboard/agent-activity?page=${page - 1}`} className="btn-secondary py-1.5 px-3 text-xs">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Previous
            </Link>
          ) : (
            <span className="btn-secondary py-1.5 px-3 text-xs opacity-40 cursor-not-allowed">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Previous
            </span>
          )}
          {page < pages ? (
            <Link href={`/dashboard/agent-activity?page=${page + 1}`} className="btn-secondary py-1.5 px-3 text-xs">
              Next
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          ) : (
            <span className="btn-secondary py-1.5 px-3 text-xs opacity-40 cursor-not-allowed">
              Next
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
