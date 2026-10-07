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

The sample product is projects and tasks for two demo companies, Acme Inc and Globex Corp.

## Architecture diagram

```text
AI Agent
  -> OAuth 2.1 + PKCE (Supabase Auth)
  -> MCP server (apps/mcp-server, Streamable HTTP /mcp)
  -> authorize(user, action, resource)
  -> domain services (packages/domain)
  -> Postgres with row-level security
```

The Next.js app (`apps/web`) is the same SaaS: login, consent, projects, approvals, and agent activity. It calls the same domain package as the MCP server.

Details: [docs/architecture.md](docs/architecture.md).



## Features

- Streamable HTTP MCP server with eight tools and two resources (`project://{projectId}`, `organization://current`)
- Supabase OAuth 2.1 with PKCE and an in-app consent screen
- Roles: admin, member, viewer. Tenant id comes from membership, not from the agent
- `delete_task` creates a pending approval. The task is deleted only after an admin approves it
- Rate limits by tool category, with an optional Redis store
- Audit log and an Agent Activity page
- Structured errors that do not leak SQL or stack traces

## Quick start

Requirements: Node.js 22, pnpm 10, and a Supabase project. This repo does not use the Supabase CLI.

```bash
pnpm install
cp .env.example .env.local
```

Fill in `.env.local`. Then, in the Supabase SQL editor, run these files in order:

1. `supabase/migrations/20260922120000_initial_schema.sql`
2. `supabase/migrations/20260923120000_rls_policies.sql`

Seed the demo data and start both apps:

```bash
pnpm db:seed
pnpm --filter @mcp-saas-starter/web dev
pnpm --filter @mcp-saas-starter/mcp-server dev
```

| Surface      | URL                          |
| ------------ | ---------------------------- |
| Web app      | http://localhost:3000        |
| MCP endpoint | http://127.0.0.1:3001/mcp    |
| Health       | http://127.0.0.1:3001/health |

Demo password for every seed user: `Password123!`

| Email                     | Organization | Role   |
| ------------------------- | ------------ | ------ |
| admin@acme.example.com    | Acme Inc     | admin  |
| member@acme.example.com   | Acme Inc     | member |
| viewer@acme.example.com   | Acme Inc     | viewer |
| admin@globex.example.com  | Globex Corp  | admin  |
| member@globex.example.com | Globex Corp  | member |

Enable the Supabase OAuth 2.1 server and set the Authorization Path to `/oauth-consent` before connecting an MCP client. Steps are in [docs/authentication.md](docs/authentication.md).

## Authentication flow

The MCP server is a resource server. Supabase Auth is the authorization server.

1. The client calls `/mcp` without a token and receives 401 plus protected-resource metadata.
2. The client starts Authorization Code + PKCE against Supabase.
3. The browser opens `http://localhost:3000/oauth-consent`. If needed, the user signs in first.
4. Approve or deny. Supabase returns a code to the client, which exchanges it for an access token.
5. Later `/mcp` calls send `Authorization: Bearer`. The server checks the JWT, then loads organization and role from membership.

`MCP_SERVER_URL` is the origin only. Clients connect to that origin plus `/mcp`.

## Multi-tenancy

Each user belongs to an organization through `memberships`. Queries and RLS use that organization. An Acme member cannot read or update Globex projects or tasks. A tool argument that includes another organization's id is ignored or rejected.

## Permissions

| Action                               | Viewer | Member | Admin |
| ------------------------------------ | ------ | ------ | ----- |
| View projects and tasks              | yes    | yes    | yes   |
| Create, update, assign tasks         | no     | yes    | yes   |
| Request delete                       | no     | no     | yes   |
| Approve or reject a protected action | no     | no     | yes   |

See [docs/authorization.md](docs/authorization.md).

## Adding a new MCP tool

Add a Zod schema, a domain function that calls `authorize()`, and a thin `registerTool` handler. The worked example is `rename_project` in [docs/adding-tools.md](docs/adding-tools.md).

## Protected actions

`delete_task` does not delete. An admin's call creates a pending row and returns "pending approval". Admins review it at `/dashboard/approvals`. Approve deletes the task. Reject leaves it in place. Members are denied before any pending row is created.

## Audit logging

Every tool call and resource read writes an `mcp_audit_events` row, including failures. The stored input is a short summary (ids and a trimmed title), not the raw description. `/dashboard/agent-activity` shows the newest events for the signed-in organization.

## Deployment

Run the web app and the MCP server as two Node processes in front of the same Supabase project. Any host works. See [docs/deployment.md](docs/deployment.md). To ship the MCP server as a container, see [docs/docker.md](docs/docker.md).

## Security considerations

Row-level security, secret handling, OAuth, rate limits, input validation, audit logs, and the delete approval flow are collected in [docs/security.md](docs/security.md).

`pnpm test` runs the unit tests and, when `.env.local` is present, the live security cases: cross-tenant read, cross-tenant write, viewer create, member delete, and admin delete staying pending.

## Roadmap

- Richer pagination cursors on list tools
- A shared error type used by the web app as well as the MCP server
- Screenshots in `docs/images/`
- Optional Redis rate limits documented for multi-instance deploys (the code is already there)

## Contributing

Open a pull request against `main`. Run `pnpm lint`, `pnpm build`, and `pnpm test` before you push. GitHub Actions runs the same steps. Do not commit `.env.local`.

New tools should follow [docs/adding-tools.md](docs/adding-tools.md): schema, domain function, thin handler, test.

## About DevStitch

DevStitch helps founders and startup teams turn AI-assisted prototypes and early SaaS products into secure, production-ready platforms, including AI features, MCP integrations and scalable application architecture.

[DevStitch](https://devstitch.example) — replace this placeholder with the live site.
