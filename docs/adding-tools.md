# Adding a new MCP tool

This walkthrough adds `rename_project`. Copy the same steps for any other SaaS action. Handlers stay thin: validate the input, then call a domain function that authorizes and writes.

## 1. Schema

In `packages/shared/src/tool-inputs.ts`, add the name and a strict Zod object. Unknown fields must fail.

```ts
export const renameProjectInput = z
  .object({
    projectId: uuidSchema,
    name: z.string().trim().min(1).max(200),
  })
  .strict();
```

Add `'rename_project'` to `TOOL_NAMES` and `renameProjectInput` to `TOOL_INPUT_SCHEMAS`. Export the schema from `packages/shared/src/index.ts`.

The HTTP `validate` middleware runs `parseToolInput` before the handler. A bad payload becomes `validation_error` and never reaches domain code.

## 2. Permission

If the action is new, add it to `AuthorizationAction` and to the role sets in `packages/authorization/src/index.ts`. Renaming a project fits the existing admin-only `project:update` action, so no new permission is required:

```ts
authorize(userContext, 'project:update');
authorize(userContext, 'project:update', { organizationId: project.organization_id });
```

## 3. Domain function

Add `renameProject` in `packages/domain`. Do not query from the MCP handler.

```ts
export async function renameProject(
  client: AppSupabaseClient,
  userContext: UserContext,
  projectId: string,
  name: string,
): Promise<Project> {
  const project = await requireProject(client, userContext, projectId);
  authorize(userContext, 'project:update', { organizationId: project.organization_id });

  const { data, error } = await client
    .from('projects')
    .update({ name: name.trim() })
    .eq('id', project.id)
    .eq('organization_id', userContext.organizationId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`renameProject failed: ${error?.message ?? 'unknown error'}`);
  }
  return data;
}
```

Export it from `packages/domain/src/index.ts`. `requireProject` already checks `project:view` and hides other tenants.

## 4. Register the tool

In `apps/mcp-server/src/tools/write-tools.ts`:

```ts
server.registerTool(
  'rename_project',
  {
    description: 'Rename a project in the signed-in organization.',
    inputSchema: renameProjectInput,
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  async (args) =>
    runAudited({
      sink: audit,
      toolName: 'rename_project',
      actionType: 'tool',
      input: args,
      work: () => renameProject(client, userContext, args.projectId, args.name),
    }),
);
```

Add `'rename_project'` to the `tools` array in `apps/mcp-server/src/tools/index.ts` so `/health` counts it.

`runAudited` times the domain call and stores a redacted audit draft. The audit middleware inserts that row with the service-role key. Put `rename_project` in the write set in `packages/rate-limit/src/limits.ts` so it uses the moderate limit.

## 5. Test

Add a domain test that an admin in Acme can rename an Acme project, and that a member is denied. A Globex project id used by an Acme admin must not change.

Rebuild and restart the MCP server:

```bash
pnpm --filter @mcp-saas-starter/shared build
pnpm --filter @mcp-saas-starter/domain build
pnpm --filter @mcp-saas-starter/mcp-server build
pnpm --filter @mcp-saas-starter/mcp-server start
```

Reconnect the MCP client so it reloads the tool list.
