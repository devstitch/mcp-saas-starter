export const PACKAGE_NAME = '@mcp-saas-starter/shared' as const;

export {
  DESCRIPTION_MAX_LENGTH,
  PAGE_LIMIT_MAX,
  TASK_STATUSES,
  TITLE_MAX_LENGTH,
  TOOL_NAMES,
  ToolInputError,
  assertStatusTransition,
  assignTaskInput,
  createTaskInput,
  deleteTaskInput,
  getProjectInput,
  getTaskInput,
  isPermittedStatusTransition,
  listProjectsInput,
  listTasksInput,
  parseToolInput,
  updateTaskInput,
} from './tool-inputs.js';

export type { ParsedToolInput, TaskStatus, ToolInputIssue, ToolName } from './tool-inputs.js';

export {
  AppError,
  InternalError,
  NotFoundError,
  ProtectedActionPendingError,
  RateLimitError,
  UnauthenticatedError,
  UnauthorizedError,
  ValidationError,
} from './errors.js';
