import type { TaskStatus } from '@mcp-saas-starter/database';

export type CreateTaskInput = {
  projectId: string;
  title: string;
  description?: string | null;
  assigneeId?: string | null;
};

export type UpdateTaskInput = {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  assigneeId?: string | null;
};
