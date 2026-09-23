# Architecture

## Boundary rule

MCP handlers stay **thin**.

```text
MCP Client
  → apps/mcp-server (transport + middleware)
    → packages/domain (business logic)
      → Supabase / Postgres (+ RLS)
```

### Do

- Register MCP tools/resources in `apps/mcp-server`
- Run cross-cutting middleware: validate → authenticate → authorize → rate-limit → audit
- Call `@mcp-saas-starter/domain` service functions from tool handlers
- Reuse `@mcp-saas-starter/auth` and `@mcp-saas-starter/authorization`

### Do not

- Put business rules inside MCP tool handlers
- Query Supabase / SQL directly from MCP handlers
- Duplicate web-app logic in the MCP layer

The web app (`apps/web`) and MCP server (`apps/mcp-server`) should both call the same domain services so permissions and tenant rules stay consistent.

## MCP transport (Prompt 8)

- Official packages: `@modelcontextprotocol/server`, `@modelcontextprotocol/node`, `@modelcontextprotocol/express`, Express
- Streamable HTTP via `createMcpExpressApp` + `NodeStreamableHTTPServerTransport` (stateless, one transport per request)
- Parsed JSON body is passed into `handleRequest` so Express and the transport do not double-read the stream
- Localhost Host/Origin guards come from `createMcpExpressApp`
- Endpoint: `POST/GET/DELETE /mcp` (Bearer token required — see `docs/authentication.md`)
- Health: `GET /health` (public)
- OAuth discovery: `/.well-known/oauth-protected-resource/mcp` and `/.well-known/oauth-authorization-server`

```bash
pnpm --filter @mcp-saas-starter/mcp-server dev
```

Read tools `list_projects`, `get_project`, `list_tasks`, and `get_task`, and write tools `create_task`, `update_task`, and `assign_task`, are registered on each request. Handlers call `@mcp-saas-starter/domain` with the membership resolved during authentication.
