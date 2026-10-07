import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProject, listTasks } from '@mcp-saas-starter/domain';
import { requireSession } from '@/lib/auth/session';
import { ProjectTasksView } from './project-tasks-view';

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

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { client, userContext } = await requireSession();

  if (!userContext) {
    return (
      <div className="fade-in space-y-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Project Details</h1>
        <div className="alert alert-warning">
          No organization membership found. Run <code className="mx-1 font-mono text-xs">pnpm db:seed</code>.
        </div>
      </div>
    );
  }

  const project = await getProject(client, userContext, projectId);
  if (!project) {
    notFound();
  }

  const tasks = await listTasks(client, userContext, projectId);
  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const blockedCount = tasks.filter((t) => t.status === 'blocked').length;
  const todoCount = tasks.filter((t) => t.status === 'todo').length;
  const progressPercent = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  return (
    <div className="fade-in space-y-8">
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center gap-3 text-xs">
        <Link
          href="/dashboard/projects"
          className="flex items-center gap-1.5 text-muted hover:text-foreground transition-colors group"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="group-hover:-translate-x-0.5 transition-transform"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Projects Directory
        </Link>
        <span className="text-muted">/</span>
        <span className="font-semibold text-foreground truncate max-w-xs">{project.name}</span>
      </div>

      {/* Project Hero Banner */}
      <div className="glass-card p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-muted text-accent">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{project.name}</h1>
              <span className={`badge ${statusBadge(project.status)}`}>
                {project.status.replace('_', ' ')}
              </span>
            </div>

            {project.description && (
              <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
                {project.description}
              </p>
            )}

            <div className="flex items-center gap-4 text-xs text-muted pt-1">
              <span>Created: {new Date(project.created_at).toLocaleDateString()}</span>
              <span>·</span>
              <span className="font-mono">ID: {project.id}</span>
            </div>
          </div>

          {/* Progress Gauge & Stat Pills */}
          <div className="w-full lg:w-72 shrink-0 rounded-xl border border-border/80 bg-surface-elevated/50 p-4">
            <div className="flex justify-between text-xs mb-2">
              <span className="font-semibold text-foreground">Project Velocity</span>
              <span className="font-bold text-accent">{progressPercent}%</span>
            </div>
            <div className="progress-track h-2 mb-3">
              <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="grid grid-cols-4 gap-1 text-center text-[0.6875rem]">
              <div className="rounded bg-surface p-1.5">
                <span className="text-muted block text-[0.625rem]">Todo</span>
                <span className="font-bold text-foreground">{todoCount}</span>
              </div>
              <div className="rounded bg-surface p-1.5">
                <span className="text-info block text-[0.625rem]">Active</span>
                <span className="font-bold text-info">{inProgressCount}</span>
              </div>
              <div className="rounded bg-surface p-1.5">
                <span className="text-danger block text-[0.625rem]">Blocked</span>
                <span className="font-bold text-danger">{blockedCount}</span>
              </div>
              <div className="rounded bg-surface p-1.5">
                <span className="text-success block text-[0.625rem]">Done</span>
                <span className="font-bold text-success">{doneCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Tasks Component (Kanban Board & List Table) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-foreground">Project Tasks</h2>
          <span className="text-xs text-muted-foreground">{tasks.length} total tasks</span>
        </div>
        <ProjectTasksView tasks={tasks} projectName={project.name} />
      </div>
    </div>
  );
}
