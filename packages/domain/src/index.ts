export const PACKAGE_NAME = '@mcp-saas-starter/domain' as const;

export type { UserContext } from '@mcp-saas-starter/auth';

export { DomainError, ForbiddenError, NotFoundError, ValidationError } from './errors.js';

export { AuthorizationError } from '@mcp-saas-starter/authorization';

export type { CreateTaskInput, UpdateTaskInput } from './access.js';

export { listProjects, getProject, requireProject, getProjectContext } from './projects.js';
export type { ProjectContext } from './projects.js';

export { getCurrentOrganization } from './organization.js';
export type { OrganizationContext } from './organization.js';

export { listTasks, getTask, requireTask, createTask, updateTask, assignTask } from './tasks.js';

export { requestDeleteTask, resolveProtectedAction } from './protected-actions.js';
