export { registerResources } from './register-resources.js';
export type { ResourceDeps } from './register-resources.js';

/** Names registered on each MCP server. Health uses the length. */
export const resources = ['project', 'organization'] as const;
