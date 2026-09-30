# Deploy the MCP server with Docker

The MCP server is one container. The Next.js app stays a separate process, because login, consent, approvals, and agent activity are the web app. Both processes use the same Supabase project.

```text
MCP client  ->  https://<mcp-host>/mcp  ->  container (port 3001)
Browser     ->  https://<web-host>      ->  Next.js app (not in this image)
Both        ->  Supabase
```

Give clients `https://<mcp-host>/mcp`. Set `MCP_SERVER_URL` to `https://<mcp-host>` with no `/mcp` suffix.

## What you need

- Docker Desktop, or Docker Engine with the Compose plugin
- A Supabase project with the SQL in `supabase/migrations` already applied, in order
- `.env.local` at the repo root, filled in from `.env.example`

The image does not contain `.env.local`. Compose injects those variables when the container starts. Do not commit that file.

## Configure

| Variable                   | Docker value                                         |
| -------------------------- | ---------------------------------------------------- |
| `SUPABASE_URL`             | Project URL                                          |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable key                                      |
| `SUPABASE_SECRET_KEY`      | Service-role key. Server only. Audit inserts need it |
| `MCP_SERVER_URL`           | Public origin clients use, with no `/mcp`            |
| `HOST`                     | `0.0.0.0` inside the container                       |
| `PORT`                     | `3001`, unless the host assigns a different port     |

`HOST=127.0.0.1` is correct for `pnpm dev` on your machine. Inside a container it would accept only connections from inside that container, so the published port would never connect. Compose sets `HOST` and `PORT` for the container and leaves the rest of `.env.local` unchanged.

For a first run on your machine, `MCP_SERVER_URL=http://127.0.0.1:3001` matches the published port. For a real client such as Claude or ChatGPT, set `MCP_SERVER_URL` to the public HTTPS origin and restart the container. The hostname in that URL is the one the server accepts in the `Host` header.

In Supabase, set the Site URL to the web app origin and keep the Authorization Path at `/oauth-consent`. The consent page is the web app, not this container.

## Build and run

From the repository root:

```bash
docker compose up --build
```

The MCP endpoint on your machine is `http://127.0.0.1:3001/mcp`. Health is `http://127.0.0.1:3001/health`.

The same image without Compose:

```bash
docker build -f apps/mcp-server/Dockerfile -t mcp-saas-starter-mcp .
docker run --rm -p 3001:3001 --env-file .env.local -e HOST=0.0.0.0 -e PORT=3001 mcp-saas-starter-mcp
```

Stop Compose with Ctrl+C, or `docker compose down` if it is running in the background.

## Check the deploy

`GET /health` returns JSON with `status` `ok`, `toolsRegistered`, and `resourcesRegistered`.

Then check:

- `https://<mcp-host>/.well-known/oauth-protected-resource/mcp` points at your Supabase auth server
- An MCP client can open the web app consent page and approve access
- An admin `delete_task` stays pending until someone approves it in the dashboard

## Put TLS in front

The container speaks HTTP. Terminate TLS at a reverse proxy or at the container host, and route that public origin to the container port.

```text
https://mcp.example.com  ->  proxy  ->  container:3001
```

Set `MCP_SERVER_URL=https://mcp.example.com`. Clients use `https://mcp.example.com/mcp`.

On a platform that injects `PORT`, publish that port instead of assuming 3001. The process listens on `PORT`. Keep `HOST=0.0.0.0`.

## More than one instance

One container can keep the default in-memory rate limiter. Shared limits across replicas need Redis.

Add this to `.env.local`:

```bash
RATE_LIMIT_STORE=redis
RATE_LIMIT_REDIS_URL=redis://redis:6379
```

`redis` is the Compose service name. It is not `127.0.0.1` from inside the MCP container.

```bash
docker compose --profile redis up --build
```

## How the image is built

The Dockerfile context is the repo root, because the server depends on the workspace packages. The build stage installs dependencies, runs `pnpm turbo run build --filter=@mcp-saas-starter/mcp-server`, then `pnpm --filter=@mcp-saas-starter/mcp-server --legacy deploy --prod` to copy a self-contained production folder. `--legacy` is required with pnpm 10 unless the workspace turns on injected workspace packages.

`dist` is gitignored. Each shared package and `apps/mcp-server` set `"files": ["dist"]` so that deploy still packs the compiled output. Leave that field in place if you change the image.

The runtime stage is Node 22. It runs `node dist/index.js` as the `node` user. Secrets stay in the host environment, not in the image layers.
