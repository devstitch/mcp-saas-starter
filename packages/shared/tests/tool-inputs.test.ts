import { describe, expect, it } from 'vitest';
import {
  DESCRIPTION_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  ToolInputError,
  assertStatusTransition,
  parseToolInput,
} from '../src/index.js';

const PROJECT_ID = '11111111-1111-4111-8111-111111111111';
const TASK_ID = '22222222-2222-4222-8222-222222222222';
const USER_ID = '33333333-3333-4333-8333-333333333333';

function reject(toolName: string, raw: unknown): ToolInputError {
  try {
    parseToolInput(toolName, raw);
  } catch (error) {
    expect(error).toBeInstanceOf(ToolInputError);
    return error as ToolInputError;
  }
  throw new Error(`expected ${toolName} to reject`);
}

describe('parseToolInput', () => {
  it('accepts list_projects with no arguments', () => {
    expect(parseToolInput('list_projects', {})).toEqual({
      name: 'list_projects',
      args: {},
    });
  });

  it('rejects a project id that is not a uuid', () => {
    const error = reject('get_project', { projectId: 'not-a-uuid' });
    expect(error.issues[0]?.path).toBe('projectId');
  });

  it('rejects an unknown status', () => {
    const error = reject('list_tasks', { projectId: PROJECT_ID, status: 'archived' });
    expect(error.issues.some((issue) => issue.path === 'status')).toBe(true);
  });

  it('rejects an oversized title and description', () => {
    const error = reject('create_task', {
      projectId: PROJECT_ID,
      title: 'x'.repeat(TITLE_MAX_LENGTH + 1),
      description: 'y'.repeat(DESCRIPTION_MAX_LENGTH + 1),
    });
    expect(error.issues.map((issue) => issue.path).sort()).toEqual(['description', 'title']);
  });

  it('rejects a blank title', () => {
    const error = reject('create_task', {
      projectId: PROJECT_ID,
      title: '   ',
    });
    expect(error.issues[0]?.path).toBe('title');
  });

  it('rejects an assignee id that is not a uuid', () => {
    const error = reject('assign_task', { taskId: TASK_ID, assigneeId: 'user-1' });
    expect(error.issues[0]?.path).toBe('assigneeId');
  });

  it('rejects unknown fields', () => {
    const error = reject('delete_task', { taskId: TASK_ID, organizationId: USER_ID });
    expect(error.issues[0]?.path).toBe('(root)');
  });

  it('rejects an unknown tool name', () => {
    const error = reject('drop_database', {});
    expect(error.issues[0]?.message).toBe('Unknown tool.');
  });

  it('accepts a valid create_task payload', () => {
    const parsed = parseToolInput('create_task', {
      projectId: PROJECT_ID,
      title: '  Write tests  ',
      description: 'Cover validation',
      assigneeId: USER_ID,
    });
    expect(parsed).toEqual({
      name: 'create_task',
      args: {
        projectId: PROJECT_ID,
        title: 'Write tests',
        description: 'Cover validation',
        assigneeId: USER_ID,
      },
    });
  });
});

describe('status transitions', () => {
  it('allows the forward path and the blocked side state', () => {
    expect(() => assertStatusTransition('todo', 'in_progress')).not.toThrow();
    expect(() => assertStatusTransition('in_progress', 'done')).not.toThrow();
    expect(() => assertStatusTransition('todo', 'blocked')).not.toThrow();
    expect(() => assertStatusTransition('in_progress', 'blocked')).not.toThrow();
    expect(() => assertStatusTransition('blocked', 'in_progress')).not.toThrow();
    expect(() => assertStatusTransition('done', 'in_progress')).not.toThrow();
    expect(() => assertStatusTransition('todo', 'todo')).not.toThrow();
  });

  it('rejects jumps that skip the state machine', () => {
    const jumps: Array<
      ['todo' | 'in_progress' | 'blocked' | 'done', 'todo' | 'in_progress' | 'blocked' | 'done']
    > = [
      ['todo', 'done'],
      ['blocked', 'done'],
      ['done', 'todo'],
      ['done', 'blocked'],
    ];

    for (const [from, to] of jumps) {
      expect(() => assertStatusTransition(from, to)).toThrow(ToolInputError);
    }
  });
});
