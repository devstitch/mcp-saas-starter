export const RATE_LIMIT_WINDOW_SECONDS = 60;

export const RATE_LIMITS = {
  read: 120,
  write: 30,
  sensitive: 5,
} as const;

export type RateLimitCategory = keyof typeof RATE_LIMITS;

const READ_NAMES = new Set([
  'list_projects',
  'get_project',
  'list_tasks',
  'get_task',
  'project',
  'organization',
]);

const WRITE_NAMES = new Set(['create_task', 'update_task', 'assign_task']);

const SENSITIVE_NAMES = new Set(['delete_task']);

export function categoryForName(name: string): RateLimitCategory | null {
  if (READ_NAMES.has(name)) return 'read';
  if (WRITE_NAMES.has(name)) return 'write';
  if (SENSITIVE_NAMES.has(name)) return 'sensitive';
  return null;
}

export function limitForCategory(category: RateLimitCategory): number {
  return RATE_LIMITS[category];
}
