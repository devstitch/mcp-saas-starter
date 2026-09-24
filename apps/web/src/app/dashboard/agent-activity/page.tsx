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

export default async function AgentActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = pageNumber((await searchParams).page);
  const { client, userContext } = await requireSession();

  if (!userContext) {
    return (
      <main className="space-y-2">
        <h1 className="text-2xl font-semibold">Agent Activity</h1>
        <p className="text-sm text-amber-700">
          No organization membership found. Run <code>pnpm db:seed</code>.
        </p>
      </main>
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

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Agent Activity</h1>
        <p className="text-sm text-neutral-600">
          What connected agents did in {userContext.role === 'admin' ? 'your' : 'this'}{' '}
          organization. Newest first.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          Could not load agent activity.
        </p>
      ) : null}

      {events.length === 0 ? (
        <p className="text-sm text-neutral-600">No agent activity yet.</p>
      ) : (
        <div className="overflow-x-auto rounded border border-neutral-200 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">User</th>
                <th className="px-3 py-2 font-medium">Tool</th>
                <th className="px-3 py-2 font-medium">Affected</th>
                <th className="px-3 py-2 font-medium">Result</th>
                <th className="px-3 py-2 font-medium">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="px-3 py-2 whitespace-nowrap text-neutral-600">
                    {new Date(event.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">{users.get(event.user_id) ?? event.user_id}</td>
                  <td className="px-3 py-2">
                    <span className="font-medium">{event.tool_name}</span>
                    <span className="text-neutral-500"> · {event.action_type}</span>
                  </td>
                  <td className="px-3 py-2">{affected(event.input_metadata)}</td>
                  <td className="px-3 py-2">{event.result_status}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {event.execution_time_ms === null ? '—' : `${event.execution_time_ms} ms`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center gap-4 text-sm">
        {page > 1 ? (
          <Link href={`/dashboard/agent-activity?page=${page - 1}`} className="underline">
            Previous
          </Link>
        ) : (
          <span className="text-neutral-400">Previous</span>
        )}
        <span className="text-neutral-600">
          Page {page} of {pages}
        </span>
        {page < pages ? (
          <Link href={`/dashboard/agent-activity?page=${page + 1}`} className="underline">
            Next
          </Link>
        ) : (
          <span className="text-neutral-400">Next</span>
        )}
      </div>
    </main>
  );
}
