import type { Json, ProtectedAction } from '@mcp-saas-starter/database';
import { requireSession } from '@/lib/auth/session';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveProtectedActionAction } from './actions';

function payloadSummary(payload: Json): string {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return 'No payload summary';
  }
  const title = typeof payload.title === 'string' ? payload.title : '';
  const taskId = typeof payload.taskId === 'string' ? payload.taskId : '';
  const summary = [title, taskId].filter(Boolean).join(' · ');
  return summary || 'No payload summary';
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
      <main className="space-y-2">
        <h1 className="text-2xl font-semibold">Pending Agent Actions</h1>
        <p className="text-sm text-amber-700">
          No organization membership found. Run <code>pnpm db:seed</code>.
        </p>
      </main>
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
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Pending Agent Actions</h1>
        <p className="text-sm text-neutral-600">
          {userContext.role} · delete requests wait here until an admin approves or rejects them.
        </p>
      </div>

      {notice === 'approved' ? (
        <p className="text-sm text-green-700" role="status">
          Approved. The task was deleted.
        </p>
      ) : null}
      {notice === 'rejected' ? (
        <p className="text-sm text-neutral-700" role="status">
          Rejected. The task was not deleted.
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {listError ? (
        <p className="text-sm text-red-600" role="alert">
          Could not load pending actions.
        </p>
      ) : null}

      {!isAdmin ? (
        <p className="text-sm text-neutral-600">Only an admin can approve or reject.</p>
      ) : null}

      {pending.length === 0 ? (
        <p className="text-sm text-neutral-600">No pending actions.</p>
      ) : (
        <ul className="space-y-3">
          {pending.map((action) => (
            <li key={action.id} className="rounded border border-neutral-200 bg-white p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-medium">{action.tool_name}</h2>
                <span className="text-xs uppercase tracking-wide text-neutral-500">
                  {action.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-neutral-700">{payloadSummary(action.payload)}</p>
              <p className="mt-1 text-sm text-neutral-500">
                Requested by {requesters.get(action.requested_by) ?? action.requested_by}
              </p>
              {isAdmin ? (
                <div className="mt-4 flex gap-2">
                  <form action={resolveProtectedActionAction}>
                    <input type="hidden" name="protectedActionId" value={action.id} />
                    <input type="hidden" name="decision" value="approved" />
                    <button
                      type="submit"
                      className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white"
                    >
                      Approve
                    </button>
                  </form>
                  <form action={resolveProtectedActionAction}>
                    <input type="hidden" name="protectedActionId" value={action.id} />
                    <input type="hidden" name="decision" value="rejected" />
                    <button
                      type="submit"
                      className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium"
                    >
                      Reject
                    </button>
                  </form>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
