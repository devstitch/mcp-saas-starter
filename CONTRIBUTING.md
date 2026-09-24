# Contributing

Thanks for contributing to MCP SaaS Starter.

## Setup

1. Install Node.js 22 and pnpm 10.
2. `pnpm install`
3. Copy `.env.example` to `.env.local` and fill in the Supabase values.
4. Apply `supabase/migrations` in order in the Supabase SQL editor.
5. `pnpm db:seed`
6. `pnpm --filter @mcp-saas-starter/web dev` and `pnpm --filter @mcp-saas-starter/mcp-server dev`

Do not commit `.env.local` or any secret key.

## Branches

Branch from `main`:

- `feat/short-name` for a feature
- `fix/short-name` for a bug
- `docs/short-name` for documentation only

## Pull requests

1. Keep the change focused. One tool, one bug, or one docs pass per pull request.
2. Run locally:

```bash
pnpm lint
pnpm build
pnpm test
pnpm format
```

`pnpm test` runs unit tests always. Live Supabase tests run when `.env.local` has `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY`.

3. Open a pull request against `main`. Fill in the pull request template.
4. GitHub Actions runs install, lint, build, and test. Live database tests are skipped in CI because those secrets are not in the workflow.

New MCP tools follow [docs/adding-tools.md](docs/adding-tools.md): Zod schema, domain function that calls `authorize()`, thin handler, test.

## Security reports

Do not file a public issue for a vulnerability. Use [SECURITY.md](SECURITY.md).
