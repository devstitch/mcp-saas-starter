import { listProjects, listTasks } from '@mcp-saas-starter/domain';
import type { Project, Task } from '@mcp-saas-starter/database';
import { requireSession } from '@/lib/auth/session';

type ProjectWithTasks = {
  project: Project;
  tasks: Task[];
};

export default async function ProjectsPage() {
  const { client, userContext } = await requireSession();

  if (!userContext) {
    return (
      <main className="space-y-2">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <p className="text-sm text-amber-700">
          No organization membership found. Run <code>pnpm db:seed</code>.
        </p>
      </main>
    );
  }

  const projects = await listProjects(client, userContext);

  const projectsWithTasks: ProjectWithTasks[] = [];
  for (const project of projects) {
    const tasks = await listTasks(client, userContext, project.id);
    projectsWithTasks.push({ project, tasks });
  }

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Projects</h1>
        <p className="text-sm text-neutral-600">
          {userContext.role} · {projects.length} project
          {projects.length === 1 ? '' : 's'}
        </p>
      </div>

      {projectsWithTasks.length === 0 ? (
        <p className="text-sm text-neutral-600">No projects in this organization yet.</p>
      ) : (
        <ul className="space-y-6">
          {projectsWithTasks.map(({ project, tasks }) => (
            <li key={project.id} className="rounded border border-neutral-200 bg-white p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-medium">{project.name}</h2>
                <span className="text-xs uppercase tracking-wide text-neutral-500">
                  {project.status}
                </span>
              </div>
              {project.description ? (
                <p className="mt-1 text-sm text-neutral-600">{project.description}</p>
              ) : null}

              <div className="mt-4">
                <h3 className="text-sm font-medium text-neutral-700">Tasks ({tasks.length})</h3>
                {tasks.length === 0 ? (
                  <p className="mt-2 text-sm text-neutral-500">No tasks.</p>
                ) : (
                  <ul className="mt-2 divide-y divide-neutral-100 border border-neutral-100">
                    {tasks.map((task) => (
                      <li
                        key={task.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                      >
                        <span>{task.title}</span>
                        <span className="text-xs text-neutral-500">
                          {task.status}
                          {task.assignee_id ? '' : ' · unassigned'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
