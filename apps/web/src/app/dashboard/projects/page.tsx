import Link from 'next/link';
import { listProjects, listTasks } from '@mcp-saas-starter/domain';
import type { Project } from '@mcp-saas-starter/database';
import { requireSession } from '@/lib/auth/session';

type ProjectRowData = {
  project: Project;
  totalTasks: number;
  doneTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
};

function statusBadge(status: string) {
  switch (status) {
    case 'active':
      return 'badge-success';
    case 'completed':
      return 'badge-accent';
    case 'on_hold':
      return 'badge-warning';
    case 'archived':
      return 'badge-muted';
    default:
      return 'badge-muted';
  }
}

export default async function ProjectsPage() {
  const { client, userContext } = await requireSession();

  if (!userContext) {
    return (
      <div className="fade-in space-y-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Projects</h1>
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

  const projects = await listProjects(client, userContext);
  const projectsData: ProjectRowData[] = [];
  let orgTotalTasks = 0;
  let orgTotalDone = 0;

  for (const project of projects) {
    const tasks = await listTasks(client, userContext, project.id);
    const doneCount = tasks.filter((t) => t.status === 'done').length;
    const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
    const blockedCount = tasks.filter((t) => t.status === 'blocked').length;

    orgTotalTasks += tasks.length;
    orgTotalDone += doneCount;

    projectsData.push({
      project,
      totalTasks: tasks.length,
      doneTasks: doneCount,
      inProgressTasks: inProgressCount,
      blockedTasks: blockedCount,
    });
  }

  const overallProgress = orgTotalTasks > 0 ? Math.round((orgTotalDone / orgTotalTasks) * 100) : 0;
  const activeCount = projects.filter((p) => p.status === 'active').length;

  return (
    <div className="fade-in space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Projects Directory</h1>
          <p className="text-sm text-muted-foreground">
            All organizational projects. Select a row to inspect and manage its tasks in a separate workspace.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="badge badge-accent">Role: {userContext.role}</span>
          <span className="badge badge-info">{projects.length} Total Projects</span>
        </div>
      </div>

      {/* KPI Overview Metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="stat-card">
          <span className="stat-label">Active Projects</span>
          <div className="flex items-baseline justify-between">
            <span className="stat-value">{activeCount}</span>
            <span className="text-xs text-muted-foreground">of {projects.length} total</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-success">
            <span className="glow-dot bg-success" />
            <span>{projects.length - activeCount} archived or on hold</span>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-label">Managed Tasks</span>
          <div className="flex items-baseline justify-between">
            <span className="stat-value">{orgTotalTasks}</span>
            <span className="text-xs font-semibold text-info">{overallProgress}% completed</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{orgTotalDone} resolved</span>
            <span>·</span>
            <span>{orgTotalTasks - orgTotalDone} remaining</span>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-label">Overall Completion</span>
          <div className="mt-2">
            <div className="progress-track h-2">
              <div className="progress-fill" style={{ width: `${overallProgress}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>Organization Health</span>
              <span className="font-semibold text-foreground">{overallProgress}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Projects Table */}
      {projectsData.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-elevated text-muted mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <p className="text-base font-semibold text-foreground">No projects found</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Run <code className="font-mono text-accent">pnpm db:seed</code> to populate demo projects.
          </p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>Status</th>
                  <th className="w-48">Progress</th>
                  <th>Tasks Breakdown</th>
                  <th>Created</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {projectsData.map(({ project, totalTasks, doneTasks, inProgressTasks, blockedTasks }) => {
                  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

                  return (
                    <tr
                      key={project.id}
                      className="group cursor-pointer transition-colors hover:bg-surface-hover"
                    >
                      {/* Name & Description */}
                      <td>
                        <Link
                          href={`/dashboard/projects/${project.id}`}
                          className="flex items-center gap-3.5 block"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-muted text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                            </svg>
                          </div>
                          <div>
                            <span className="font-semibold text-foreground group-hover:text-accent transition-colors text-sm">
                              {project.name}
                            </span>
                            {project.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1 max-w-md mt-0.5">
                                {project.description}
                              </p>
                            )}
                          </div>
                        </Link>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`badge ${statusBadge(project.status)}`}>
                          {project.status.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Progress Bar & Percentage */}
                      <td>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono text-muted-foreground">
                              {doneTasks}/{totalTasks}
                            </span>
                            <span className="font-semibold text-foreground">{progress}%</span>
                          </div>
                          <div className="progress-track h-1.5">
                            <div className="progress-fill" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      </td>

                      {/* Tasks breakdown pills */}
                      <td>
                        <div className="flex items-center gap-1.5">
                          <span className="badge badge-muted text-[0.625rem]">{totalTasks} total</span>
                          {inProgressTasks > 0 && (
                            <span className="badge badge-info text-[0.625rem]">{inProgressTasks} active</span>
                          )}
                          {blockedTasks > 0 && (
                            <span className="badge badge-danger text-[0.625rem]">{blockedTasks} blocked</span>
                          )}
                        </div>
                      </td>

                      {/* Created date */}
                      <td className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                        {new Date(project.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Action Button */}
                      <td className="text-right">
                        <Link
                          href={`/dashboard/projects/${project.id}`}
                          className="btn-secondary py-1 px-3 text-xs inline-flex items-center gap-1.5 group-hover:border-accent group-hover:text-accent transition-all"
                        >
                          <span>Open</span>
                          <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
