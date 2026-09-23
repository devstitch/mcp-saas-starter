# Database package tests

## RLS denial tests

Apply these SQL files in the Supabase SQL Editor (in order), then run tests:

1. `supabase/migrations/20260922120000_initial_schema.sql`
2. `supabase/migrations/20260923120000_rls_policies.sql`

Ensure `.env.local` has:

```
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
```

Run:

```bash
pnpm test:rls
```

The suite creates temporary users/orgs, asserts the four PRD denials, then cleans up.
