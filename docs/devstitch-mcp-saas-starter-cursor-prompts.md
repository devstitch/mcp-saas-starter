# Cursor Build Prompts — DevStitch MCP SaaS Starter

How to use this: paste these into Cursor **one at a time, in order**, inside the repo you're building. Let Cursor finish and let you review/run each step before moving to the next — don't batch them. Each prompt is self-contained enough that Cursor won't need the whole PRD re-pasted, but it references the same architecture throughout so context carries forward within the same Cursor project.

Milestone tags (M1–M4) map to the PRD's implementation milestones so you can track progress.

---

## Prompt 1 — Monorepo scaffolding (M1)

```
Set up a Turborepo + pnpm monorepo called "mcp-saas-starter" for an open-source reference
architecture. Requirements:

- Package manager: pnpm, with a pnpm-workspace.yaml
- Turborepo at the root with a turbo.json (build, dev, lint, test pipelines)
- Structure exactly as follows:
  apps/web            (Next.js + React app — dashboard, auth, oauth-consent, agent-activity, approvals)
  apps/mcp-server      (standalone Node/TypeScript MCP server — tools/, resources/, middleware/, server/)
  packages/database
  packages/auth
  packages/authorization
  packages/domain
  packages/audit
  packages/rate-limit
  packages/shared
  supabase/migrations
  supabase/seed.sql
  docs/
  examples/
- Root: TypeScript strict mode, ESLint + Prettier, a .env.example, MIT LICENSE, CONTRIBUTING.md,
  SECURITY.md placeholder, README.md placeholder.
- apps/web: Next.js (App Router) + React + TypeScript, Tailwind for styling.
- apps/mcp-server: standalone Node.js TypeScript service (NOT a Next.js API route) so it can be
  deployed independently of the web app, per the "deploy the MCP layer separately" requirement.
- Each package should have its own package.json with proper workspace dependencies
  (apps/web and apps/mcp-server both depend on packages/domain, packages/auth,
  packages/authorization, packages/audit, packages/rate-limit, packages/database).
- Do not add business logic yet — this step is scaffolding only. Every package should build
  (even if just exporting a placeholder) and `pnpm install && pnpm build` should succeed.
```

---

## Prompt 2 — Supabase schema & migrations (M1)

```
In supabase/migrations, create the initial schema migration(s) for this multi-tenant SaaS.
Tables (exact fields, plus sane defaults/timestamps/indexes):

organizations: id (uuid pk), name, created_at
memberships: user_id (fk auth.users), organization_id (fk organizations), role
  (enum: admin, member, viewer), primary key (user_id, organization_id)
projects: id, organization_id (fk), name, description, status, created_by, created_at, updated_at
tasks: id, project_id (fk), organization_id (fk, denormalized for RLS simplicity), title,
  description, status, assignee_id, created_by, created_at, updated_at
mcp_audit_events: id, organization_id, user_id, client_id (nullable), tool_name, action_type,
  input_metadata (jsonb — never store raw sensitive payloads here), result_status,
  execution_time_ms, created_at
protected_actions: id, organization_id, requested_by, tool_name, payload (jsonb),
  status (enum: pending, approved, rejected), approved_by (nullable), requested_at, resolved_at (nullable)

Requirements:
- Use Postgres enums where noted.
- Add foreign keys and indexes on organization_id on every tenant-scoped table (this is the
  primary tenant-isolation key and will be used constantly in RLS policies and queries).
- Add an updated_at trigger for projects and tasks.
- Do not write RLS policies yet — that is the next step. Just get the schema and constraints
  right and generate the Supabase TypeScript types.
```

---

## Prompt 3 — Row Level Security policies + cross-tenant tests (M1)

```
Add RLS policies as a new Supabase migration in supabase/migrations for all tenant-scoped
tables (organizations, memberships, projects, tasks, mcp_audit_events, protected_actions).

Core rule: a user can only read/write rows whose organization_id matches an organization_id
they have a membership row for (via auth.uid() = memberships.user_id). Enforce this even if
application code sends a wrong or spoofed organization_id — RLS must be the last line of
defense described in the PRD's "Multi-Tenant Security" section.

Additional constraints:
- Only admins can write to protected_actions status/approved_by columns (resolution).
  Any org member can create a pending protected_action request via a SECURITY DEFINER
  function if needed — but the write path should still validate role.
- Viewers should have SELECT-only policies everywhere; no INSERT/UPDATE/DELETE policies for viewer role.
- mcp_audit_events should be insert-only from the app's service role; regular users can SELECT
  events for their own organization only (for the Agent Activity screen) but never delete.

Then write a supabase/tests (or packages/database/tests) SQL or pgTAP test suite — or a
TypeScript integration test using the Supabase client — for these specific cases from the PRD:
1. Organization A cannot SELECT Organization B's projects.
2. Organization A cannot UPDATE Organization B's tasks.
3. A viewer-role user cannot INSERT into tasks.
4. A member without admin role cannot resolve a protected_action.
Each test should assert the operation is denied.
```

---

## Prompt 4 — Seed data (M1)

```
Write supabase/seed.sql (or a TypeScript seed script in packages/database/seed/) that creates:
- One demo organization ("Acme Inc")
- A second organization ("Globex Corp") purely to prove tenant isolation in manual testing
- At least 4 users split across roles: 2 admins, 2 members, 1 viewer, distributed across both orgs
- 3-4 projects per organization with varied status values
- 8-10 tasks per project with varied status and assignee_id values, some unassigned
- No protected_actions or audit events yet (those get created at runtime)

Make it idempotent (safe to re-run) and document how to run it in a comment header,
plus add a `pnpm db:seed` script at the root that wires it up.
```

---

## Prompt 5 — Auth: Supabase Auth + basic web app shell (M1)

```
In apps/web, wire up Supabase Auth (email/password is fine for the demo — no need for OAuth
providers on the human-login side). Build:
- /login page
- /dashboard shell (protected route, redirects to /login if unauthenticated)
- A basic layout with DevStitch branding placeholder and nav for: Projects, Agent Activity,
  Pending Actions (these last two can be stub pages for now, filled in later)
- A server-side helper (in packages/auth) that resolves the current user's organization_id(s)
  and role(s) from the memberships table, to be reused by both the web app and later the MCP server.
- Middleware that protects all /dashboard/* routes.

Keep this minimal — the PRD explicitly says not to over-invest in UI design. Functional and
clean is the bar, not polished.
```

---

## Prompt 6 — Domain/application service layer (M1 → M2 bridge)

```
Create packages/domain with plain TypeScript service functions that encapsulate ALL business
logic for projects and tasks — no MCP-specific or web-specific code here. This is the layer
both the web app and the MCP server will call, per the PRD's core architectural rule: "MCP
tools should call application/domain services rather than duplicating business logic inside
the MCP handlers."

Implement:
- listProjects(userContext): Project[]
- getProject(userContext, projectId): Project | null
- listTasks(userContext, projectId): Task[]
- getTask(userContext, taskId): Task | null
- createTask(userContext, input): Task
- updateTask(userContext, taskId, input): Task
- assignTask(userContext, taskId, assigneeId): Task
- requestDeleteTask(userContext, taskId): ProtectedAction  (does NOT delete — creates a
  protected_action row, per the destructive-action workflow)
- resolveProtectedAction(adminContext, protectedActionId, decision: "approved"|"rejected"): void
  (performs the actual delete only on "approved")

userContext should be a small type: { userId, organizationId, role }. These functions should
use the Supabase client from packages/database and should NOT trust any organization_id passed
in from a caller other than userContext — always scope queries by userContext.organizationId.

Wire apps/web's Projects page to actually use these service functions now (real data, not stubs).
```

---

## Prompt 7 — Authorization layer (M2/M3)

```
Create packages/authorization implementing a single reusable function:

  authorize(user: UserContext, action: string, resource?: Resource): boolean | throws AuthorizationError

Support these actions at minimum, matching the PRD's role table:
  "project:view", "project:create", "project:update"
  "task:view", "task:create", "task:update", "task:assign", "task:delete"
  "protected_action:approve"

Role rules (admin > member > viewer):
- viewer: only *:view actions
- member: view/create/update tasks and assign permitted tasks; cannot create/modify projects,
  cannot delete tasks directly, cannot approve protected actions
- admin: everything, including project create/update and protected_action:approve

authorize() should throw a typed AuthorizationError (not just return false) so calling code in
packages/domain can catch it and translate it into a clean MCP/API error later. Retrofit
packages/domain's service functions from Prompt 6 to call authorize() at the top of every
function before touching the database, replacing any ad hoc role checks.

Add unit tests in packages/authorization covering every action × every role combination
(a full matrix), plus the "viewer attempts write" and "member attempts delete" denial cases
from the PRD's Definition of Done.
```

---

## Prompt 8 — MCP server scaffold with Streamable HTTP (M2)

```
In apps/mcp-server, scaffold a remote MCP server using the official MCP TypeScript SDK v2
(2026-07-28 spec) with the Streamable HTTP transport (not legacy HTTP+SSE). Requirements:
- A standalone Node.js HTTP server (Express or the framework the SDK v2 examples recommend)
  exposing a single MCP endpoint, e.g. POST /mcp
- Keep it stateless where the SDK allows, so it can scale horizontally behind a load balancer
- No tools or resources registered yet — just get a client able to connect, complete the MCP
  handshake, and see an empty tool list
- A middleware/ folder with placeholder middleware functions for: authenticate, validate,
  authorize, rateLimit, audit — each currently a no-op pass-through, to be filled in in later
  prompts. Wire them into the request pipeline in this order:
  Validate → Authenticate → Authorize → Application Service → Audit → Return
  (matching the PRD's stated handler pipeline)
- Add a .env.example entry for MCP_SERVER_URL and a `pnpm dev --filter mcp-server` script
- Document in docs/architecture.md (create this file) the boundary rule: MCP handlers stay
  thin and call into packages/domain; they must never contain direct business logic or direct
  database queries.

Verify manually that an MCP inspector or test client can connect to http://localhost:<port>/mcp
and list zero tools successfully.
```

---

## Prompt 9 — OAuth 2.1 (Supabase) integration for MCP auth (M2)

```
Wire up authentication between MCP clients and the mcp-server using Supabase's OAuth 2.1 /
OIDC server capability (per supabase.com/docs/guides/auth/oauth-server) — do NOT build a
custom OAuth server, per the PRD.

Requirements:
- apps/web: add an OAuth consent screen at /oauth-consent showing: requesting client name,
  the currently authenticated user, the scopes/access being requested, and Approve/Deny buttons.
- Implement the Authorization Code + PKCE flow so an MCP client can:
  1. discover the auth configuration,
  2. redirect the human to log in to the SaaS if not already,
  3. show the consent screen,
  4. exchange the authorization code for an access token,
  5. present that access token on subsequent MCP requests.
- In apps/mcp-server/middleware, implement the real `authenticate` middleware: validate the
  incoming access token as a Supabase JWT, extract the user id, and resolve their
  organization_id + role via the same helper built in Prompt 5 (reuse packages/auth, don't
  duplicate). Reject requests with missing/invalid/expired tokens with a clean 401-style MCP
  error (structured, not a raw stack trace).
- Store client_id (the connecting MCP client's OAuth client id) on the resolved auth context so
  it's available for audit logging later.

Update docs/authentication.md (create it) explaining this flow end to end with a simple diagram.
```

---

## Prompt 10 — Zod input validation layer (M2/M3)

```
In packages/shared (or a new packages/validation if that's cleaner), define Zod schemas for
every MCP tool's input, matching the PRD's tool list:
- listProjectsInput (no args, or optional pagination)
- getProjectInput: { projectId: uuid }
- listTasksInput: { projectId: uuid, status: enum optional }
- getTaskInput: { taskId: uuid }
- createTaskInput: { projectId: uuid, title: string (max length), description: string optional
  (max length), assigneeId: uuid optional }
- updateTaskInput: { taskId: uuid, title?, description?, status?: enum, assigneeId?: uuid }
  — status must only allow permitted transitions (define and enforce a state machine, e.g.
  todo -> in_progress -> done, plus a "blocked" side-state; reject invalid jumps)
- assignTaskInput: { taskId: uuid, assigneeId: uuid }
- deleteTaskInput: { taskId: uuid }

Implement the real `validate` middleware in apps/mcp-server: it should look up the correct
schema by tool name, parse the raw MCP tool-call arguments, and reject with a structured
validation error (never letting a raw LLM-generated object anywhere near a database call) before
the request reaches authorization or the domain layer. Add unit tests proving malformed input
(bad UUIDs, oversized strings, invalid enum values, invalid status transitions) is rejected.
```

---

## Prompt 11 — Read tools: list_projects, get_project, list_tasks, get_task (M2)

```
In apps/mcp-server/tools, implement the four read-only MCP tools using the official SDK v2's
tool registration API:
- list_projects — returns only projects belonging to the authenticated user's organization,
  filtered further by what their role permits to view
- get_project — returns one project if authorize(user, "project:view", project) passes,
  otherwise a clean "not found or not permitted" error (don't leak existence of other orgs' data)
- list_tasks — tasks for a given accessible project
- get_task — a single permitted task

Each tool handler must strictly follow the pipeline from Prompt 8: validate → authenticate
(already resolved earlier in the pipeline) → authorize → call the packages/domain service
function from Prompt 6 → return. Do not add any authorization or query logic directly in the
tool handler files — they should be thin wrappers.

Manually verify with an MCP client: authenticate as a member of Acme Inc, call list_projects,
and confirm Globex Corp's projects never appear.
```

---

## Prompt 12 — Write tools: create_task, update_task, assign_task (M2/M3)

```
Implement create_task, update_task, and assign_task as MCP tools in apps/mcp-server/tools,
following the exact same thin-handler pattern as Prompt 11 (validate → authorize → domain
service → return). Reuse the Zod schemas from Prompt 10 and the domain functions from Prompt 6.

Add integration tests covering:
- A member successfully creating a task in their own org's project
- A viewer attempting create_task and being denied
- A member attempting to update a task in another organization's project and being denied
  (cross-tenant write — should fail at both the authorize() layer and, if that's somehow
  bypassed, at the RLS layer)
- assign_task succeeding only when the assignee is actually a member of the same organization
```

---

## Prompt 13 — Protected/destructive action workflow: delete_task (M3)

```
Implement the delete_task MCP tool as a protected action, per the PRD's exact flow:
delete_task -> authorization check -> create pending protected_action row -> (no deletion yet)
-> return a "pending approval" result to the MCP client, NOT a success/failure for the delete
itself.

Then:
- In apps/web, add a "Pending Agent Actions" section (a route like /dashboard/approvals) where
  admins can see pending protected_actions for their org with tool_name, requester, and payload
  summary, and Approve/Reject buttons.
- Approve should call resolveProtectedAction(...) from packages/domain, which performs the
  actual delete only on approval, sets status/approved_by/resolved_at.
- Reject should just mark it rejected — no delete happens.
- Only admins can approve/reject (enforce via authorize(user, "protected_action:approve", ...)).

Add tests for the PRD's exact security cases:
- Member invokes delete_task -> denied outright (members can't even request it — check the PRD's
  role table again: only admins can approve, but decide here whether members can *request* one;
  if the PRD implies delete is admin-only end to end, deny members at the authorize() step
  before a pending action is even created)
- Admin invokes delete_task -> result is "pending approval", not an immediate delete
- Admin approves -> task is actually deleted
- Admin rejects -> task still exists, protected_action marked rejected
```

---

## Prompt 14 — MCP resources: project:// and organization://current (M2)

```
In apps/mcp-server/resources, implement two MCP resources using the SDK v2's resource
registration API:
- project://{projectId} — returns contextual project info (name, description, status, task
  counts) to an authorized client, enforcing the same authorize(user, "project:view", project)
  check as the get_project tool
- organization://current — returns safe, non-sensitive context about the authenticated user's
  current organization (name, member count, project count) — no other members' PII, no
  cross-tenant leakage

Both resources must go through the same authenticate → authorize pipeline as tools (reuse the
middleware, don't build a parallel path). Add a short section to docs/architecture.md
explaining that MCP integration in this project isn't limited to tools.
```

---

## Prompt 15 — Rate limiting (M3)

```
Implement packages/rate-limit with a pluggable interface, e.g.:

  interface RateLimiter {
    check(key: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; retryAfterSeconds?: number }>
  }

Provide two implementations:
1. An in-memory implementation for local development (default, zero external dependencies)
2. A Redis-compatible implementation (behind the same interface) that can be swapped in via an
   env var for production, documented but not required to run locally

Wire the real `rateLimit` middleware in apps/mcp-server to key by a composite of
(userId, organizationId, clientId, toolName), with different limits per tool category:
- read tools (list_projects, get_project, list_tasks, get_task, and the two resources): high limit
- write tools (create_task, update_task, assign_task): moderate limit
- sensitive tools (delete_task): strict limit

On limit exceeded, return a structured "rate limit reached" MCP error (see Prompt 16's error
taxonomy) rather than a generic failure. Document the limits and the Redis swap-in path in
docs/security.md (create this file).
```

---

## Prompt 16 — Structured error handling (M3)

```
Define a shared error taxonomy in packages/shared used consistently across the MCP server and
web app: ValidationError, UnauthenticatedError, UnauthorizedError, NotFoundError,
RateLimitError, ProtectedActionPendingError, InternalError.

Update the MCP server's request pipeline so every middleware/tool/resource throws one of these
typed errors instead of generic Error/strings, and add a single top-level error handler in
apps/mcp-server/server that maps each type to a clean, structured MCP-protocol-appropriate error
response — with a stable error code and safe message. Guarantee that InternalError responses
NEVER leak database error messages, stack traces, SQL, or infrastructure details to the client;
log the full detail server-side (console or a logger) but return only a generic message plus a
correlation id.

Add tests asserting that a deliberately triggered database failure results in a generic
InternalError to the client while the real error still appears in server logs.
```

---

## Prompt 17 — Audit logging + Agent Activity UI (M3)

```
Implement the real `audit` middleware in apps/mcp-server: after every tool call or resource
access (success or failure), write an mcp_audit_events row with organization_id, user_id,
client_id, tool_name, action_type, input_metadata (a redacted/summarized version of the input —
never raw sensitive payloads), result_status, execution_time_ms, created_at. Measure
execution_time_ms by wrapping the actual domain-service call.

Then in apps/web, build the /dashboard/agent-activity page: a table of recent MCP audit events
for the current organization (user, tool, resource affected, result, duration, timestamp),
newest first, paginated. This is explicitly called out in the PRD as an important showcase
feature ("I can see exactly what an AI agent did inside my product") — keep it simple but make
sure it's genuinely useful for demoing, not just a raw dump.

Add a test proving a successful create_task call produces exactly one audit event with the
correct tool_name and a "success" result_status, and a denied cross-tenant attempt still
produces an audit event (with a "denied"/"error" result_status) — audit logging should capture
failed attempts too, not just successes.
```

---

## Prompt 18 — Automated test suite pass (unit + integration + security) (M3/M4)

```
Review the full repo and fill any testing gaps against the PRD's "Testing Requirements" section.
Ensure the following all exist and pass:

Unit tests: permission functions (packages/authorization matrix — already done in Prompt 7 but
verify coverage), input validation (Prompt 10), protected actions logic, core domain logic
(Prompt 6).

Integration tests: authenticated tool call succeeds; unauthenticated request is rejected;
incorrect role is denied; tenant isolation holds for both read and write; a full write operation
succeeds end to end; a full destructive/protected operation goes through the pending-approval
flow correctly.

Security test cases (must exist as explicit named tests, matching the PRD table exactly):
1. Cross-tenant read -> Denied
2. Cross-tenant write -> Denied
3. Viewer write (create_task) -> Denied
4. Unauthorized destructive action (member invokes delete_task) -> Denied
5. Admin destructive action (admin invokes delete_task) -> Pending approval (not immediate delete)

Wire these into a CI-friendly `pnpm test` at the root that runs across all packages/apps, and
add a GitHub Actions workflow (.github/workflows/ci.yml) running install, lint, build, and test
on push/PR.
```

---

## Prompt 19 — README, architecture diagram, and docs (M4)

```
Write the root README.md following the PRD's exact required structure:
- Above the fold: title "MCP SaaS Starter", tagline "Add a secure MCP interface to your
  existing SaaS.", and a simple text/ASCII architecture flow: AI Agent -> OAuth -> MCP Server ->
  Permissions -> Your SaaS
- Sections in this order: What this project solves; Architecture diagram; Demo/screenshots
  (use placeholder image paths under /docs/images/ with a note for real screenshots to be added);
  Features; Quick start; Authentication flow; Multi-tenancy; Permissions; Adding a new MCP tool;
  Protected actions; Audit logging; Deployment; Security considerations; Roadmap; Contributing;
  About DevStitch
- The "About DevStitch" section should be short and non-promotional, matching the PRD's wording
  style: "DevStitch helps founders and startup teams turn AI-assisted prototypes and early SaaS
  products into secure, production-ready platforms, including AI features, MCP integrations and
  scalable application architecture." with a placeholder link.

Also finish these docs/ files if not already complete from earlier prompts:
- architecture.md — layer boundaries (MCP / domain / database / auth / authorization)
- authentication.md — the OAuth 2.1 + PKCE flow end to end
- authorization.md — RBAC + tenant isolation model
- adding-tools.md — a concrete step-by-step walkthrough of exposing one new SaaS action as an
  MCP tool (this is called out as particularly important in the PRD — make it genuinely
  copy-pasteable for someone adding tool #5)
- security.md — RLS, secrets handling, OAuth, rate limits, input validation, audit logs,
  destructive-action handling, all in one place
- deployment.md — a vendor-neutral deployment overview (the MCP server and web app can be
  deployed separately; don't lock to one specific host)
```

---

## Prompt 20 — Final repository polish for public release (M4)

```
Do a final pass to bring the repo to public open-source quality per the PRD's "Public
Repository Quality" checklist. Confirm/add:
- MIT LICENSE file (real, not placeholder)
- .env.example fully lists every env var used across apps/web and apps/mcp-server, with
  comments explaining each
- CONTRIBUTING.md with a real contribution workflow (branch naming, PR process, running tests
  locally)
- SECURITY.md with a real responsible-disclosure contact process
- .github/ISSUE_TEMPLATE/ (bug report + feature request templates)
- .github/PULL_REQUEST_TEMPLATE.md
- CI workflow from Prompt 18 is green
- ESLint + Prettier configured and passing with no errors across all packages
- Double-check there is no leftover DevStitch-internal code, credentials, API keys, or
  client-specific references anywhere in the repo — grep for anything that looks like a real
  secret or internal project name and remove it
- Confirm the 10 "Definition of Done" scenarios from the PRD are all genuinely demonstrable by
  a stranger following only the README, starting from `git clone` with no other context:
  connect + authenticate, list own-org projects only, read project/task info, create/update a
  task, viewer write denied, cross-org access denied at both app and RLS level, destructive
  action creates a pending approval instead of executing, admin approves it, Agent Activity
  shows what happened, and the whole thing runs from the README alone.

List anything from this checklist that is still incomplete so I know what's left before tagging
a v1 release.
```

---

### Notes on using this sequence

- **Don't skip the review step** between prompts — Cursor will build faster than you can verify, and small authorization mistakes compound (a broken `authorize()` in Prompt 7 will silently make every later tool "work" without actually being secure).
- If Cursor's context gets long, it's fine to open a fresh chat/composer for each prompt — the repo state on disk is what carries continuity, not the chat history.
- Prompts 11–14 (the actual MCP tools/resources) are the highest-value ones to manually test against a real MCP client (Claude, an MCP inspector, etc.) rather than trusting only automated tests, since cross-tenant leakage is exactly the kind of bug that's easy to miss in unit tests but obvious in five seconds of manual poking.
