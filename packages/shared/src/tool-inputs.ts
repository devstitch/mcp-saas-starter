import { z } from 'zod';

export const TITLE_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 5000;
export const PAGE_LIMIT_MAX = 100;

export const TASK_STATUSES = ['todo', 'in_progress', 'blocked', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TOOL_NAMES = [
  'list_projects',
  'get_project',
  'list_tasks',
  'get_task',
  'create_task',
  'update_task',
  'assign_task',
  'delete_task',
] as const;
export type ToolName = (typeof TOOL_NAMES)[number];

const taskStatusSchema = z.enum(TASK_STATUSES);
const uuidSchema = z.uuid();

const titleSchema = z.string().trim().min(1).max(TITLE_MAX_LENGTH);
const descriptionSchema = z.string().trim().max(DESCRIPTION_MAX_LENGTH);

/**
 * todo → in_progress → done.
 * blocked is a side state from todo or in_progress, and returns to either of those.
 * done can reopen to in_progress.
 */
const PERMITTED_STATUS_TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  todo: ['in_progress', 'blocked'],
  in_progress: ['todo', 'blocked', 'done'],
  blocked: ['todo', 'in_progress'],
  done: ['in_progress'],
};

export function isPermittedStatusTransition(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return true;
  return PERMITTED_STATUS_TRANSITIONS[from].includes(to);
}

export const listProjectsInput = z
  .object({
    limit: z.number().int().min(1).max(PAGE_LIMIT_MAX).optional(),
    cursor: z.string().trim().min(1).max(500).optional(),
  })
  .strict();

export const getProjectInput = z
  .object({
    projectId: uuidSchema,
  })
  .strict();

export const listTasksInput = z
  .object({
    projectId: uuidSchema,
    status: taskStatusSchema.optional(),
  })
  .strict();

export const getTaskInput = z
  .object({
    taskId: uuidSchema,
  })
  .strict();

export const createTaskInput = z
  .object({
    projectId: uuidSchema,
    title: titleSchema,
    description: descriptionSchema.optional(),
    assigneeId: uuidSchema.optional(),
  })
  .strict();

export const updateTaskInput = z
  .object({
    taskId: uuidSchema,
    title: titleSchema.optional(),
    description: descriptionSchema.optional(),
    status: taskStatusSchema.optional(),
    assigneeId: uuidSchema.optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.title !== undefined ||
      value.description !== undefined ||
      value.status !== undefined ||
      value.assigneeId !== undefined,
    { message: 'At least one field to update is required.' },
  );

export const assignTaskInput = z
  .object({
    taskId: uuidSchema,
    assigneeId: uuidSchema,
  })
  .strict();

export const deleteTaskInput = z
  .object({
    taskId: uuidSchema,
  })
  .strict();

const TOOL_INPUT_SCHEMAS = {
  list_projects: listProjectsInput,
  get_project: getProjectInput,
  list_tasks: listTasksInput,
  get_task: getTaskInput,
  create_task: createTaskInput,
  update_task: updateTaskInput,
  assign_task: assignTaskInput,
  delete_task: deleteTaskInput,
} as const;

export type ToolInputIssue = {
  path: string;
  message: string;
};

export class ToolInputError extends Error {
  readonly toolName: string;
  readonly issues: ToolInputIssue[];

  constructor(toolName: string, issues: ToolInputIssue[]) {
    const detail = issues.map((issue) => `${issue.path}: ${issue.message}`).join('; ');
    super(detail ? `${toolName}: ${detail}` : `${toolName}: invalid input`);
    this.name = 'ToolInputError';
    this.toolName = toolName;
    this.issues = issues;
  }
}

export type ParsedToolInput = {
  [Name in ToolName]: {
    name: Name;
    args: z.infer<(typeof TOOL_INPUT_SCHEMAS)[Name]>;
  };
}[ToolName];

function isToolName(value: string): value is ToolName {
  return (TOOL_NAMES as readonly string[]).includes(value);
}

function issuesFromZod(error: z.ZodError): ToolInputIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.map(String).join('.') : '(root)',
    message: issue.message,
  }));
}

/**
 * Parse one MCP tool call's arguments. Throws ToolInputError on any failure.
 */
export function parseToolInput(toolName: string, raw: unknown): ParsedToolInput {
  if (!isToolName(toolName)) {
    throw new ToolInputError(toolName || '(missing)', [
      { path: 'name', message: 'Unknown tool.' },
    ]);
  }

  const parsed = TOOL_INPUT_SCHEMAS[toolName].safeParse(raw ?? {});
  if (!parsed.success) {
    throw new ToolInputError(toolName, issuesFromZod(parsed.error));
  }

  return { name: toolName, args: parsed.data } as ParsedToolInput;
}

/**
 * Reject a status jump that the state machine does not allow.
 * Keeping the same status is allowed.
 */
export function assertStatusTransition(from: TaskStatus, to: TaskStatus): void {
  if (isPermittedStatusTransition(from, to)) return;
  throw new ToolInputError('update_task', [
    {
      path: 'status',
      message: `Cannot change status from ${from} to ${to}.`,
    },
  ]);
}
