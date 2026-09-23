export { registerReadTools } from './read-tools.js';
export type { ReadToolDeps } from './read-tools.js';
export { registerWriteTools } from './write-tools.js';
export type { WriteToolDeps } from './write-tools.js';

/** Names registered on each MCP server. Health uses the length. */
export const tools = [
  'list_projects',
  'get_project',
  'list_tasks',
  'get_task',
  'create_task',
  'update_task',
  'assign_task',
] as const;
