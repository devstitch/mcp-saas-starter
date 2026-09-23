export const PACKAGE_NAME = '@mcp-saas-starter/domain' as const;

export type { UserContext } from '@mcp-saas-starter/auth';

export {
  DomainError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from './errors.js';

export { AuthorizationError } from '@mcp-saas-starter/authorization';

export type { CreateTaskInput, UpdateTaskInput } from './access.js';

export { listProjects, getProject, requireProject } from './projects.js';

export {
  listTasks,
  getTask,
  requireTask,
  createTask,
  updateTask,
  assignTask,
} from './tasks.js';

export { requestDeleteTask, resolveProtectedAction } from './protected-actions.js';
