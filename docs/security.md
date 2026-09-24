# Security

## Row-level security

Every tenant table enables RLS. Membership for `auth.uid()` is the source of tenant access. Policies live in `supabase/migrations/20260923120000_rls_policies.sql`.

- Members can read rows in their own organization.
- Viewers cannot insert or update tasks.
- Authenticated users cannot delete tasks. A real delete uses the service-role key after an admin approves a protected action.
- `mcp_audit_events` can be read by members and inserted only with the service role.

The user-scoped Supabase client sends the caller's access token. Domain queries also filter on `organization_id` from membership.

## Secrets

`.env.local` is gitignored. `.env.example` lists names only.

| Variable                                   | Where it may appear                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Web and MCP server. The web app inlines only these two for the browser                           |
| `SUPABASE_SECRET_KEY`                      | Server only: seed, audit insert, task delete after approval. Never put it in `next.config` `env` |
| `MCP_SERVER_URL`, `HOST`, `PORT`           | MCP server                                                                                       |

Missing required variables throw at startup. There are no empty-string fallbacks.

## OAuth

Supabase Auth is the OAuth 2.1 authorization server (Authorization Code + PKCE). The MCP server only checks access tokens. See `docs/authentication.md`.

Tokens are verified with `supabase.auth.getClaims`. A missing or invalid token is HTTP 401. A valid token with no membership is HTTP 403. Organization id is never taken from the tool payload.

## Rate limits

Every `tools/call` and `resources/read` for a known tool or resource is limited per user, organization, OAuth client, and name. The window is 60 seconds.

| Category  | Names                                                                                                       | Limit |
| --------- | ----------------------------------------------------------------------------------------------------------- | ----- |
| Read      | `list_projects`, `get_project`, `list_tasks`, `get_task`, `project://{projectId}`, `organization://current` | 120   |
| Write     | `create_task`, `update_task`, `assign_task`                                                                 | 30    |
| Sensitive | `delete_task`                                                                                               | 5     |

Other MCP methods, including `initialize` and `tools/list`, are not counted.

When the limit is exceeded the server responds with HTTP 429, a `Retry-After` header, and:

```json
{
  "error": "rate_limit_reached",
  "error_description": "Rate limit reached. Retry after 12 seconds.",
  "retry_after_seconds": 12
}
```

Local development uses an in-memory limiter. Counts reset when the process restarts and are not shared across processes.

Production can switch to Redis without changing call sites:

```bash
RATE_LIMIT_STORE=redis
RATE_LIMIT_REDIS_URL=redis://127.0.0.1:6379
```

`RATE_LIMIT_STORE=redis` without `RATE_LIMIT_REDIS_URL` fails at startup. Leave `RATE_LIMIT_STORE` unset to keep the memory limiter.

## Input validation

Tool arguments are strict Zod schemas in `packages/shared`. The MCP server validates `tools/call` before domain code runs. Titles are limited to 200 characters, descriptions to 5000, and task status changes must follow the allowed transitions. Unknown fields are rejected.

## Audit logs

Each tool call and resource read writes one `mcp_audit_events` row, including denials. `input_metadata` keeps ids and a short title. Descriptions are dropped. The dashboard lists these events at `/dashboard/agent-activity`.

## Destructive actions

`delete_task` does not delete. An admin request creates a pending `protected_actions` row. Approve, in the web app, deletes the task with the service-role client. Reject leaves the task in place. Members cannot request the delete.

## Errors

Internal failures return `internal_error`, a generic message, and a correlation id. The database message, SQL, and stack stay in the server log.
