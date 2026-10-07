# Deployment

The web app and the MCP server are separate processes. Deploy them on any host that can run Node.js. They share one Supabase project. Nothing in this repo assumes a specific platform.

```text
Browser  →  Web app (Next.js, port 3000)
              consent, dashboard, approvals

MCP client  →  MCP server (Express, port 3001)
                 /mcp  and  /health

Both  →  Supabase (Auth, Postgres, RLS)
```

## What each process needs

**Web app**

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` on the server only, for approving a delete and for showing requester emails

Set the Supabase Site URL to the public web origin, and keep the Authorization Path at `/oauth-consent`.

**MCP server**

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` (audit inserts bypass row-level security)
- `MCP_SERVER_URL` set to the public origin clients use, with no `/mcp` suffix
- `HOST` and `PORT`

Give clients `https://<mcp-host>/mcp`. The consent page stays on the web origin. Supabase redirects the browser there during login.

## Database

Apply the SQL files in `supabase/migrations` in order, in the Supabase SQL editor. This repo does not use the Supabase CLI. Then run `pnpm db:seed` once for the demo organizations.

## Rate limits across instances

The default limiter is in memory and is not shared between processes. When you run more than one MCP instance, set:

```bash
RATE_LIMIT_STORE=redis
RATE_LIMIT_REDIS_URL=redis://<host>:6379
```

## Docker

The MCP server has its own image and Compose file. The web app stays a separate process. See [docs/docker.md](docs/docker.md).

## Checks after deploy

- `GET /health` on the MCP server returns `toolsRegistered` and `resourcesRegistered`
- `https://<mcp-host>/.well-known/oauth-protected-resource/mcp` points at your Supabase auth server
- A user with no membership receives 403, not data
- An admin `delete_task` creates a pending row and does not delete the task until someone approves it in the dashboard
