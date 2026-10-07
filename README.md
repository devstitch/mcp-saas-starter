# MCP SaaS Starter

Add a secure MCP interface to your existing SaaS.

```text
AI Agent
  -> OAuth
  -> MCP Server
  -> Permissions
  -> Your SaaS
```

## What this project solves

Connecting an AI agent to a multi-tenant SaaS product is easy to do unsafely: the agent picks an organization id, a tool deletes data immediately, and nobody can see what happened.

This repository is a reference implementation of the opposite. Agents authenticate as real users, tools run only inside that user's organization, destructive deletes wait for an admin, and every call is written to an audit log.

The sample product is projects and tasks for two demo companies, Acme Inc and Globex Corp. The Next.js app (`apps/web`) and the MCP server (`apps/mcp-server`) both call the same domain package.

## Architecture

```text
AI Agent
  -> OAuth 2.1 + PKCE (Supabase Auth)
  -> MCP server (Streamable HTTP /mcp)
  -> validate, authenticate, authorize, rate-limit, audit
  -> domain services (packages/domain)
  -> Postgres with row-level security
```

| Piece | Where | What it does |
| ----- | ----- | ------------ |
| Web app | `apps/web` | Landing, login, consent, projects, approvals, agent activity |
| MCP server | `apps/mcp-server` | Streamable HTTP, bearer auth, thin tool and resource handlers |
| Auth | `packages/auth` | User id, organization, and role from membership |
| Authorization | `packages/authorization` | Role checks and cross-tenant denial |
| Domain | `packages/domain` | Business rules. Calls `authorize()` before reads and writes |
| Database | `packages/database`, `supabase/migrations` | Typed Supabase client and Postgres with RLS |
| Shared | `packages/shared` | Zod tool inputs, task status transitions, errors |
| Audit | `packages/audit` | Redacted audit rows for every tool call and resource read |
| Rate limit | `packages/rate-limit` | In-memory limiter, optional Redis |

Details: [docs/architecture.md](docs/architecture.md).

## Features

- Streamable HTTP MCP server with eight tools and two resources (`project://{projectId}`, `organization://current`)
- Supabase OAuth 2.1 with PKCE and an in-app consent screen at `/oauth-consent`
- Roles: admin, member, viewer. Tenant id comes from membership, not from the agent
- `delete_task` creates a pending approval. The task is deleted only after an admin approves it
- Rate limits by tool category (120 reads, 30 writes, 5 sensitive calls per minute), with an optional Redis store
- Audit log and an Agent Activity page
- Structured errors that do not leak SQL or stack traces
- Docker image for the MCP server ([docs/docker.md](docs/docker.md))

## Quick start

Requirements: Node.js 22, pnpm 10, and a Supabase project. This repo does not use the Supabase CLI.

```bash
pnpm install
cp .env.example .env.local
```

Fill in `.env.local` (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`). Then, in the Supabase SQL editor, run these files in order:

1. `supabase/migrations/20260922120000_initial_schema.sql`
2. `supabase/migrations/20260923120000_rls_policies.sql`

Seed the demo data and start both apps:

```bash
pnpm db:seed
pnpm dev
```

`pnpm dev` starts the web app and the MCP server together. To run one process:

```bash
pnpm --filter @mcp-saas-starter/web dev
pnpm --filter @mcp-saas-starter/mcp-server dev
```

The MCP server can also run in Docker: `docker compose up --build`. See [docs/docker.md](docs/docker.md).

| Surface | URL |
| ------- | --- |
| Web app | http://localhost:3000 |
| Sign in | http://localhost:3000/login |
| OAuth consent | http://localhost:3000/oauth-consent |
| Dashboard | http://localhost:3000/dashboard |
| Projects | http://localhost:3000/dashboard/projects |
| Approvals | http://localhost:3000/dashboard/approvals |
| Agent activity | http://localhost:3000/dashboard/agent-activity |
| MCP endpoint | http://127.0.0.1:3001/mcp |
| Health | http://127.0.0.1:3001/health |

`GET /health` is public and returns `status`, `toolsRegistered` (8), and `resourcesRegistered` (2). `/mcp` requires `Authorization: Bearer`.

Demo password for every seed user: `Password123!`

| Email | Organization | Role |
| ----- | ------------ | ---- |
| admin@acme.example.com | Acme Inc | admin |
| member@acme.example.com | Acme Inc | member |
| viewer@acme.example.com | Acme Inc | viewer |
| admin@globex.example.com | Globex Corp | admin |
| member@globex.example.com | Globex Corp | member |

Seed data gives Acme four projects (Alpha, Beta, Gamma, Delta) and Globex four projects (Launch, Infra, Support, Archive). Each project has tasks in `todo`, `in_progress`, `blocked`, and `done`. Re-running `pnpm db:seed` replaces those projects and tasks.

Enable the Supabase OAuth 2.1 server and set the Authorization Path to `/oauth-consent` before connecting an MCP client. Steps are in [docs/authentication.md](docs/authentication.md).

## Authentication flow

The MCP server is a resource server. Supabase Auth is the authorization server.

1. The client calls `/mcp` without a token and receives 401 plus protected-resource metadata.
2. The client starts Authorization Code + PKCE against Supabase.
3. The browser opens `http://localhost:3000/oauth-consent`. If needed, the user signs in first.
4. Approve or deny. Supabase returns a code to the client, which exchanges it for an access token.
5. Later `/mcp` calls send `Authorization: Bearer`. The server checks the JWT, then loads organization and role from membership.

`MCP_SERVER_URL` is the origin only. Clients connect to that origin plus `/mcp`.

Discovery on the MCP origin:

- `GET /.well-known/oauth-protected-resource/mcp`
- `GET /.well-known/oauth-authorization-server`

## Postman

Import these files into Postman:

- [postman/mcp-saas-starter.postman_collection.json](postman/mcp-saas-starter.postman_collection.json)
- [postman/mcp-saas-starter.local.postman_environment.json](postman/mcp-saas-starter.local.postman_environment.json)

Select the **MCP SaaS Starter (local)** environment. Set `supabaseUrl` and `supabasePublishableKey` from `.env.local`, start the MCP server, then run the requests in this order:

1. **Health** — confirms the server is up.
2. **Sign in as Acme admin** — password grant against Supabase. Saves `accessToken` and `assigneeId`. This is only for Postman. MCP clients use OAuth 2.1 + PKCE.
3. **Initialize**, then **List tools**.
4. **List projects** — saves `projectId` from the first project.
5. **List tasks** — saves `taskId`. The write requests use those variables.
6. **Delete task** — returns `pending_approval`. The task stays until an admin approves it at `/dashboard/approvals`.

`/mcp` speaks JSON-RPC 2.0. Send `Content-Type: application/json` and `Accept: application/json, text/event-stream`. A successful call may come back as JSON or as a `text/event-stream` `data:` line. The collection tests accept both.

## MCP tools

| Tool | Who | Arguments |
| ---- | --- | --------- |
| `list_projects` | viewer+ | optional `limit` (1–100), optional `cursor` |
| `get_project` | viewer+ | `projectId` |
| `list_tasks` | viewer+ | `projectId`, optional `status` |
| `get_task` | viewer+ | `taskId` |
| `create_task` | member+ | `projectId`, `title`, optional `description`, optional `assigneeId` |
| `update_task` | member+ | `taskId` plus at least one of `title`, `description`, `status`, `assigneeId` |
| `assign_task` | member+ | `taskId`, `assigneeId` (must be a member of the same organization) |
| `delete_task` | admin | `taskId`. Creates a pending approval and does not delete |

Task status moves are limited: `todo` → `in_progress` or `blocked`; `in_progress` → `todo`, `blocked`, or `done`; `blocked` → `todo` or `in_progress`; `done` → `in_progress`. The same status is allowed.

Resources, on the same `/mcp` route:

- `project://{projectId}` — name, description, status, and task count
- `organization://current` — organization name, member count, and project count. No member emails

Example `tools/call` body:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "list_projects",
    "arguments": { "limit": 20 }
  }
}
```

## Multi-tenancy

Each user belongs to an organization through `memberships`. Queries and RLS use that organization. An Acme member cannot read or update Globex projects or tasks. A tool argument that includes another organization's id is ignored or rejected.

## Permissions

| Action | Viewer | Member | Admin |
| ------ | ------ | ------ | ----- |
| View projects and tasks | yes | yes | yes |
| Create, update, assign tasks | no | yes | yes |
| Request delete | no | no | yes |
| Approve or reject a protected action | no | no | yes |

See [docs/authorization.md](docs/authorization.md).

## Adding a new MCP tool

Add a Zod schema, a domain function that calls `authorize()`, and a thin `registerTool` handler. The worked example is `rename_project` in [docs/adding-tools.md](docs/adding-tools.md).

## Protected actions

`delete_task` does not delete. An admin's call creates a pending row and returns `pending_approval`. Admins review it at `/dashboard/approvals`. Approve deletes the task with the service-role key, because RLS blocks a user delete. Reject leaves the task in place. Members are denied before any pending row is created.

## Audit logging

Every tool call and resource read writes an `mcp_audit_events` row, including failures. The stored input is a short summary (ids and a trimmed title), not the raw description. `/dashboard/agent-activity` shows the newest events for the signed-in organization.

## Deployment

Run the web app and the MCP server as two Node processes in front of the same Supabase project. Any host works. See [docs/deployment.md](docs/deployment.md). To ship the MCP server as a container, see [docs/docker.md](docs/docker.md).

One process can keep the in-memory rate limiter. More than one MCP process needs Redis: set `RATE_LIMIT_STORE=redis` and `RATE_LIMIT_REDIS_URL`. Compose can start Redis with `docker compose --profile redis up --build`.

## Security considerations

Row-level security, secret handling, OAuth, rate limits, input validation, audit logs, and the delete approval flow are collected in [docs/security.md](docs/security.md).

`pnpm test` runs the unit tests and, when `.env.local` is present, the live security cases: cross-tenant read, cross-tenant write, viewer create, member delete, and admin delete staying pending.

## Roadmap

- Richer pagination cursors on list tools (`limit` is applied; `cursor` is accepted and not yet used)
- A shared error type used by the web app as well as the MCP server

## Contributing

Open a pull request against `main`. Run `pnpm lint`, `pnpm build`, and `pnpm test` before you push. GitHub Actions runs the same steps. Do not commit `.env.local`.

New tools should follow [docs/adding-tools.md](docs/adding-tools.md): schema, domain function, thin handler, test.

## About DevStitch

DevStitch helps founders and startup teams turn AI-assisted prototypes and early SaaS products into secure, production-ready platforms, including AI features, MCP integrations and scalable application architecture.

[DevStitch](https://devstitch.com/)
