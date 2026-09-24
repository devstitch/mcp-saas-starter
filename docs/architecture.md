# Architecture

## Layers

| Layer          | Package / app                                  | Responsibility                                                                                                 |
| -------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| MCP            | `apps/mcp-server`                              | Streamable HTTP, OAuth resource-server checks, validation, rate limits, audit, thin tool and resource handlers |
| Web            | `apps/web`                                     | Login, OAuth consent, projects, pending approvals, agent activity                                              |
| Authentication | `packages/auth`                                | Who the caller is: user id plus the organization and role from membership                                      |
| Authorization  | `packages/authorization`                       | Whether that role may perform the action, including cross-tenant denial                                        |
| Domain         | `packages/domain`                              | Business rules. Calls `authorize()` before it reads or writes                                                  |
| Database       | `packages/database` plus `supabase/migrations` | Typed Supabase client and Postgres with row-level security                                                     |
| Shared         | `packages/shared`                              | Zod tool inputs, status transitions, error taxonomy                                                            |
| Audit          | `packages/audit`                               | Redacted audit drafts and timing around a domain call                                                          |
| Rate limit     | `packages/rate-limit`                          | In-memory limiter, with a Redis implementation behind the same interface                                       |

## Boundary rule

MCP handlers stay thin.

```text
MCP Client
  → apps/mcp-server (transport + middleware)
    → packages/domain (business logic)
      → Supabase / Postgres (+ RLS)
```

### Do

- Register MCP tools and resources in `apps/mcp-server`
- Run middleware in this order: validate → authenticate → authorize → rate-limit → audit
- Call `@mcp-saas-starter/domain` from tool handlers
- Reuse `@mcp-saas-starter/auth` and `@mcp-saas-starter/authorization`

### Do not

- Put business rules inside MCP tool handlers
- Query Supabase or SQL directly from MCP handlers
- Take `organization_id` from the agent. Tenant id comes from membership
- Duplicate web-app logic in the MCP layer

The web app and the MCP server both call the same domain services so permissions and tenant rules stay consistent.

## MCP transport

- Official packages: `@modelcontextprotocol/server`, `@modelcontextprotocol/node`, `@modelcontextprotocol/express`, and Express
- Streamable HTTP via `createMcpExpressApp` and `NodeStreamableHTTPServerTransport` (stateless, one transport per request)
- The parsed JSON body is passed into `handleRequest`
- Endpoint: `POST` / `GET` / `DELETE /mcp` (Bearer token required — see `docs/authentication.md`)
- Health: `GET /health` (public)
- OAuth discovery: `/.well-known/oauth-protected-resource/mcp` and `/.well-known/oauth-authorization-server`

```bash
pnpm --filter @mcp-saas-starter/mcp-server dev
```

Tools: `list_projects`, `get_project`, `list_tasks`, `get_task`, `create_task`, `update_task`, `assign_task`, `delete_task`. `delete_task` creates a pending protected action and does not delete the task.

## Resources

MCP here is not limited to tools. `resources/list` and `resources/read` use the same `/mcp` route and the same authenticate → authorize middleware as `tools/call`.

- `project://{projectId}` returns name, description, status, and task count after `authorize(user, "project:view", project)`.
- `organization://current` returns the signed-in organization's name, member count, and project count. It does not include member emails or another organization's data.
