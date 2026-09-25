import type { Json, ProtectedAction } from '@mcp-saas-starter/database';
import { requireSession } from '@/lib/auth/session';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveProtectedActionAction } from './actions';

function payloadSummary(payload: Json): { title: string; taskId: string; projectId: string } {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { title: 'Unknown Task', taskId: '—', projectId: '—' };
  }
  const title = typeof payload.title === 'string' ? payload.title : 'Task';
  const taskId = typeof payload.taskId === 'string' ? payload.taskId : '—';
  const projectId = typeof payload.projectId === 'string' ? payload.projectId : '—';
  return { title, taskId, projectId };
}

async function requesterLabels(userIds: string[]): Promise<Map<string, string>> {
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

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { error, notice } = await searchParams;
  const { client, userContext } = await requireSession();

  if (!userContext) {
    return (
      <div className="fade-in space-y-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Pending Agent Actions</h1>
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

  const { data, error: listError } = await client
    .from('protected_actions')
    .select('*')
    .eq('organization_id', userContext.organizationId)
    .eq('status', 'pending')
    .order('requested_at', { ascending: false });

  const pending = (data ?? []) as ProtectedAction[];
  const isAdmin = userContext.role === 'admin';
  const requesters =
    isAdmin || pending.length > 0
      ? await requesterLabels([...new Set(pending.map((action) => action.requested_by))])
      : new Map<string, string>();

  return (
    <div className="fade-in space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Pending Approvals</h1>
          <p className="text-sm text-muted-foreground">
            Human-in-the-Loop security queue for guarded MCP agent operations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`badge ${isAdmin ? 'badge-accent' : 'badge-muted'}`}>
            {isAdmin ? 'Admin Approval Authority' : 'Read-Only View'}
          </span>
          {pending.length > 0 ? (
            <span className="badge badge-danger pulse-subtle">
              {pending.length} Action{pending.length === 1 ? '' : 's'} Pending
            </span>
          ) : (
            <span className="badge badge-success">0 Pending</span>
          )}
        </div>
      </div>

      {/* Notice / Feedback Alerts */}
      {notice === 'approved' && (
        <div className="alert alert-success" role="status">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          Action approved successfully. The requested deletion was executed.
        </div>
      )}

      {notice === 'rejected' && (
        <div className="alert alert-info" role="status">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          Action rejected. The entity was preserved and the agent request was cancelled.
        </div>
      )}

      {error && (
        <div className="alert alert-danger" role="alert">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          {error}
        </div>
      )}

      {listError && (
        <div className="alert alert-danger" role="alert">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          Could not fetch pending actions from database.
        </div>
      )}

      {!isAdmin && (
        <div className="alert alert-info">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          You are viewing as a member. Only administrators with elevated organization privileges can approve or reject destructive agent operations.
        </div>
      )}

      {/* Security Action Cards Queue */}
      {pending.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success-muted text-success mb-4 shadow-lg shadow-success-muted/50">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-foreground">Queue is Clear</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            No destructive operations are currently awaiting review. When an agent requests deletion of a task via MCP, it will pause here for authorization.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((action) => {
            const { title, taskId, projectId } = payloadSummary(action.payload);

            return (
              <div
                key={action.id}
                className="glass-card border-danger/30 bg-surface/80 overflow-hidden shadow-lg shadow-danger/5 transition-all hover:border-danger/50"
              >
                {/* Danger banner ribbon */}
                <div className="flex items-center justify-between border-b border-danger/20 bg-danger-muted/30 px-6 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-danger animate-pulse" />
                    <span className="text-xs font-semibold text-danger uppercase tracking-wider">
                      Destructive Operation Guard
                    </span>
                  </div>
                  <span className="font-mono text-[0.6875rem] text-muted-foreground">
                    Action ID: {action.id.slice(0, 8)}...
                  </span>
                </div>

                <div className="p-6">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    {/* Left: Action summary & parameters */}
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger-muted text-danger">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-foreground">
                              MCP Tool: <span className="font-mono text-danger">{action.tool_name}</span>
                            </h3>
                            <span className="badge badge-pending">Review Required</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Requested by <span className="font-medium text-foreground">{requesters.get(action.requested_by) ?? action.requested_by}</span>
                            <span className="mx-2">·</span>
                            {new Date(action.requested_at).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Payload details box */}
                      <div className="rounded-xl border border-border/80 bg-surface-elevated/60 p-4">
                        <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted mb-2">
                          Target Entity Payload
                        </p>
                        <div className="grid gap-2 sm:grid-cols-3 text-xs">
                          <div>
                            <span className="text-muted block text-[0.6875rem]">Target Title:</span>
                            <span className="font-semibold text-foreground">{title}</span>
                          </div>
                          <div>
                            <span className="text-muted block text-[0.6875rem]">Task ID:</span>
                            <span className="font-mono text-muted-foreground">{taskId}</span>
                          </div>
                          <div>
                            <span className="text-muted block text-[0.6875rem]">Project ID:</span>
                            <span className="font-mono text-muted-foreground">{projectId}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Approve / Reject Decision Buttons */}
                    {isAdmin ? (
                      <div className="flex flex-row lg:flex-col gap-3 shrink-0">
                        <form action={resolveProtectedActionAction} className="w-full">
                          <input type="hidden" name="protectedActionId" value={action.id} />
                          <input type="hidden" name="decision" value="approved" />
                          <button
                            type="submit"
                            className="btn-success w-full py-2.5 px-5 text-xs font-semibold shadow-md shadow-success/20"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Approve & Delete
                          </button>
                        </form>

                        <form action={resolveProtectedActionAction} className="w-full">
                          <input type="hidden" name="protectedActionId" value={action.id} />
                          <input type="hidden" name="decision" value="rejected" />
                          <button
                            type="submit"
                            className="btn-danger w-full py-2.5 px-5 text-xs font-semibold"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                            Reject & Preserve
                          </button>
                        </form>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-border bg-surface-elevated/40 p-3 text-center text-xs text-muted">
                        Pending Admin Decision
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
