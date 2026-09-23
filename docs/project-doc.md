DevStitch | MCP SaaS Starter PRD
Page 1
DevStitch MCP SaaS Starter
Product Requirements Document
Project Type: Open-source reference architecture
Repository: devstitch/mcp-saas-starter
License: MIT
Status: V1 Planning
1. Product Summary
DevStitch MCP SaaS Starter is an open-source reference architecture demonstrating how an existing multi-tenant SaaS application can securely expose its product capabilities to AI agents and MCP-compatible clients.
The project should answer a practical SaaS founder/engineering question:
“How can I make my existing SaaS usable by AI agents through MCP without rebuilding my application or compromising authentication, permissions, tenant isolation, or auditability?”
The starter will include a deliberately small project/task-management SaaS as the example application. The SaaS itself is not the product; its purpose is to demonstrate the reusable MCP integration architecture.
2. Primary Goals
The project should demonstrate how to:
1.
Add a remote MCP server to an existing SaaS.
2.
Authenticate MCP users using the SaaS's existing user accounts.
3.
Preserve organization/tenant boundaries.
4.
Apply existing role-based permissions to MCP tool calls.
5.
Expose read and write SaaS functionality as MCP tools.
6.
Protect sensitive/destructive actions.
7.
Validate all agent-provided inputs.
8.
Rate-limit MCP usage.
9.
Produce a complete audit trail of MCP activity.
10.
Deploy the MCP layer separately without duplicating core SaaS business logic.
The project should be useful both as:

a learning/reference project for developers;

a starting architecture for SaaS teams adding MCP;

a technical proof asset demonstrating DevStitch's AI-native SaaS engineering capabilities.
3. Target Audience
Primary
B1 — Bootstrapped SaaS founders
Founders who already have a SaaS/MVP and want to make their product accessible to ChatGPT, Claude, Cursor, agents, or other MCP-compatible systems.
Secondary
B2 — Pre-seed SaaS startups
Technical founders or engineering teams evaluating MCP as an integration/interface layer for their existing product.
DevStitch | MCP SaaS Starter PRD
Page 2
Technical Users

Full-stack engineers

SaaS developers

AI engineers

Technical founders

Product engineering teams
4. Core Positioning
Recommended GitHub headline
Add a secure MCP interface to your existing SaaS.
Production-oriented TypeScript reference architecture for connecting AI agents to a multi-tenant SaaS using authentication, permissions, RLS, audit logging, validation, rate limiting, and protected actions.
What this project is NOT
It is not:

another generic Next.js SaaS boilerplate;

an MCP SDK replacement;

an AI chatbot;

an autonomous agent framework;

a full project-management product;

an abstraction replacing the official MCP SDK.
The official TypeScript MCP SDK should remain the underlying MCP implementation.
5. Technical Baseline
Use the current MCP TypeScript SDK v2 and target the current MCP specification generation.
MCP SDK v2 is the stable TypeScript SDK line implementing the 2026-07-28 specification. (https://ts.sdk.modelcontextprotocol.io/v2/)
The hosted MCP interface should use Streamable HTTP rather than legacy HTTP+SSE. The architecture should preferably remain stateless where practical so ordinary horizontal HTTP scaling is possible.
Supabase will provide:

PostgreSQL

Auth

OAuth 2.1/OIDC

Row Level Security

database migrations
Supabase Auth currently supports OAuth 2.1 server functionality specifically suitable for authenticating MCP clients using an application's existing user base. (https://supabase.com/docs/guides/auth/oauth-server)
6. Proposed Technology Stack
Core

TypeScript

Node.js

pnpm

Turborepo
DevStitch | MCP SaaS Starter PRD
Page 3
SaaS Demo

Next.js

React

Supabase
Database

PostgreSQL via Supabase

Supabase Row Level Security
Authentication

Supabase Auth

Supabase OAuth 2.1 Server

Authorization Code + PKCE

JWT validation
MCP

Official MCP TypeScript SDK v2

Remote Streamable HTTP transport

Zod schemas for inputs
Optional Infrastructure
A Redis-compatible rate-limit adapter may be provided for production-style distributed rate limiting, but the starter should remain runnable locally without requiring unnecessary third-party services.
7. High-Level Architecture
MCP-Compatible Client ChatGPT / Claude / Cursor / etc. │ │ OAuth 2.1 ▼ ┌─────────────────┐ │ MCP Server │ │ │ │ Authentication │ │ Validation │ │ Authorization │ │ Rate Limiting │ │ Audit Logging │ └────────┬────────┘ │ ▼ Application Services │ ┌────────┴────────┐ │ │ ▼ ▼ Supabase Existing SaaS Postgres Business Logic │ ▼ RLS
The important architectural rule is:
MCP tools should call application/domain services rather than duplicating business logic inside the MCP handlers.
The same business rules should therefore be reusable from:
DevStitch | MCP SaaS Starter PRD
Page 4
Web Application │ ▼Application Services ▲ │MCP Server
8. Demo SaaS Domain
Keep the demo intentionally simple.
Organization
Represents one SaaS tenant.

id

name

created_at
Membership
Associates a user with an organization.

user_id

organization_id

role
Project

id

organization_id

name

description

status

created_by

created_at

updated_at
Task

id

project_id

organization_id

title

description

status

assignee_id

created_by

created_at

updated_at
MCP Audit Event
Fields should include at minimum:

id

organization_id

user_id

client_id where available

tool_name
DevStitch | MCP SaaS Starter PRD
Page 5

action_type

input metadata

result status

execution time

created_at
Sensitive information must not be blindly persisted in logs.
Protected Action
Used for actions requiring explicit approval.

id

organization_id

requested_by

tool_name

payload

status

approved_by

requested_at

resolved_at
9. Roles and Permissions
V1 should implement three roles.
Admin
Can:

view projects

create projects

modify projects

create/update/delete tasks

assign tasks

approve protected actions
Member
Can:

view permitted projects

create tasks

update tasks

assign permitted tasks
Cannot perform administrative/destructive actions.
Viewer
Can only use read-only tools.
Permissions must be enforced server-side.
The MCP client's UI must never be relied upon for authorization.
Supabase RLS should provide an additional database-level tenant isolation boundary.
10. Authentication Flow
Expected flow:
DevStitch | MCP SaaS Starter PRD
Page 6
MCP Client │ ▼Discovers authentication configuration │ ▼User redirected to SaaS authentication │ ▼Login │ ▼Consent Screen │ ▼Approve MCP Client │ ▼OAuth Authorization Code + PKCE │ ▼Access Token │ ▼Authenticated MCP Request
The demo web app should contain a basic consent screen showing:

requesting application/client;

authenticated user;

requested access;

Approve;

Deny.
Do not build a custom OAuth server.
Use Supabase's OAuth 2.1 capabilities.
11. MCP Tools — V1
V1 should expose a small but complete set of tools.
Read Tools
list_projects
Returns projects accessible to the current authenticated user.
get_project
Returns one project if the current user has permission to access it.
list_tasks
Returns tasks for an accessible project.
get_task
Returns a single permitted task.
12. Write Tools
create_task
Creates a task inside an authorized project.

project_id

title
DevStitch | MCP SaaS Starter PRD
Page 7

description optional

assignee optional
update_task
Updates permitted fields such as:

title

description

status

assignee
assign_task
Assigns an existing task to an eligible organization member.
Each tool must validate inputs using explicit schemas before application logic executes.
13. Protected / Destructive Action
V1 should include at least one action demonstrating how sensitive agent operations should be handled.
Recommended:
delete_task
An AI agent should NOT immediately delete the task.
Instead:
delete_task │ ▼Authorization check │ ▼Create pending protected action │ ▼User/Admin approval │ │Approve Reject │ │ ▼ ▼Delete Cancel
This gives the repository an important real-world safety demonstration.
The web dashboard should contain a small:
Pending Agent Actions
section where authorized users can approve or reject such requests.
V1 only needs one protected-action workflow to prove the pattern.
14. MCP Resources
Include at least one example showing that MCP integration is not limited to tools.
Recommended resources:
Project Resource
project://{projectId}
Provides contextual project information to authorized MCP clients.
DevStitch | MCP SaaS Starter PRD
Page 8
Organization Resource
organization://current
Returns safe context about the currently authenticated organization.
All resource access must enforce the same tenant and permission boundaries as tool calls.
15. Authorization Layer
Tool handlers should not contain large permission implementations.
Use a reusable authorization pattern such as:
authorize(user, action, resource)
Example:
authorize(user, "task:create", project)authorize(user, "task:update", task)authorize(user, "task:delete", task)
MCP handlers should conceptually remain thin:
Validate ↓Authenticate ↓Authorize ↓Application Service ↓Audit ↓Return
This separation is one of the architectural concepts we want the repository to teach.
16. Multi-Tenant Security
Every relevant database entity must belong directly or indirectly to an organization.
Application queries must never trust an organization_id supplied by the AI client.
Tenant context must come from authenticated identity/membership.
RLS policies must prevent Organization A from retrieving or modifying Organization B's records even if:

IDs are guessed;

malformed MCP calls are made;

application-level checks accidentally fail.
Tests for cross-tenant access are mandatory.
17. Input Validation
All MCP tool inputs must have explicit schemas.
Examples of validation:

UUID formatting

enums

maximum string sizes

required properties

optional properties

permitted status transitions
DevStitch | MCP SaaS Starter PRD
Page 9
Never pass arbitrary LLM-generated objects directly into database operations.
18. Rate Limiting
Provide reusable rate limiting around MCP tool execution.
At minimum allow limits by:

authenticated user;

OAuth client where available;

organization;

tool.
Example configuration:
Read tools:higher limitWrite tools:lower limitSensitive tools:strict limit
Provide a development-safe implementation and document how distributed production rate limiting can be plugged in.
19. Audit Logging
Every MCP tool execution should create an audit event.
Example:
User: john@example.comOrganization: AcmeClient: ClaudeTool: update_taskResource: TASK-123Result: SuccessDuration: 184msTimestamp: ...
The demo dashboard should provide a simple Agent Activity view.
Purpose:
“I can see exactly what an AI agent did inside my product.”
This is an important showcase feature.
20. Error Handling
Return structured MCP-friendly errors.
Differentiate between:

validation error;

unauthenticated;

unauthorized;

resource not found;

rate limit reached;

protected action pending;

internal server failure.
Internal database or infrastructure information must not be leaked to the MCP client.
DevStitch | MCP SaaS Starter PRD
Page 10
21. Suggested Repository Structure
mcp-saas-starter/│├── apps/│ ├── web/│ │ ├── dashboard│ │ ├── auth│ │ ├── oauth-consent│ │ ├── agent-activity│ │ └── approvals│ ││ └── mcp-server/│ ├── tools/│ ├── resources/│ ├── middleware/│ └── server/│├── packages/│ ├── database/│ ├── auth/│ ├── authorization/│ ├── domain/│ ├── audit/│ ├── rate-limit/│ └── shared/│├── supabase/│ ├── migrations/│ └── seed.sql│├── docs/│ ├── architecture.md│ ├── authentication.md│ ├── authorization.md│ ├── adding-tools.md│ ├── deployment.md│ └── security.md│├── examples/│├── .env.example├── CONTRIBUTING.md├── SECURITY.md├── LICENSE└── README.md
The exact package split can be adjusted by the technical lead if a simpler structure improves maintainability.
22. Local Developer Experience
The project must be straightforward for an external developer to run.
Target flow:
git clone ...pnpm install
Configure:
NEXT_PUBLIC_SUPABASE_URL=NEXT_PUBLIC_SUPABASE_ANON_KEY=SUPABASE_SERVICE_ROLE_KEY=SUPABASE_JWT_ISSUER=MCP_SERVER_URL=
DevStitch | MCP SaaS Starter PRD
Page 11
Then:
pnpm dev
Provide seed data with:

one demo organization;

multiple users;

multiple roles;

several projects;

several tasks.
A developer should not need to reverse-engineer the architecture to run the project.
23. MCP Testing
The repository should include instructions for connecting an MCP-compatible client to the server.
At minimum document:
11.
MCP endpoint;
12.
OAuth authentication;
13.
listing available tools;
14.
reading project information;
15.
creating a task;
16.
attempting an unauthorized operation;
17.
triggering a protected action.
Provide automated tests for MCP tool handlers where practical.
24. Testing Requirements
Unit Tests
Cover:

permission functions;

input validation;

protected actions;

core domain logic.
Integration Tests
Cover:

authenticated tool call;

unauthenticated request;

incorrect role;

tenant isolation;

read operation;

write operation;

destructive/protected operation.
Security Test Cases
Cross-tenant read
Organization A attempts to read Organization B's project.
Expected:
Denied
DevStitch | MCP SaaS Starter PRD
Page 12
Cross-tenant write
Organization A attempts to update Organization B's task.
Expected:
Denied
Viewer write
Viewer invokes create_task.
Expected:
Denied
Unauthorized destructive action
Member invokes delete_task.
Expected:
Denied
Admin destructive action
Admin invokes delete_task.
Expected:
Pending approval
25. Demo UI
Do NOT spend excessive time designing a full SaaS frontend.
UI exists to make the architecture demonstrable.
Required screens:
Login
Basic Supabase authentication.
Projects
Minimal project/task interface.
OAuth Consent
Shows client requesting access.
Agent Activity
Displays MCP audit events.
Pending Actions
Displays protected agent actions with:

Approve

Reject
Clean DevStitch branding is sufficient.
DevStitch | MCP SaaS Starter PRD
Page 13
26. README Requirements
The README is a major product asset and should receive similar attention to the code.
Above the fold:
MCP SaaS Starter
Add a secure MCP interface to your existing SaaS.
Then visually show:
AI Agent ↓OAuth ↓MCP Server ↓Permissions ↓Your SaaS
README sections:
18.
What this project solves
19.
Architecture diagram
20.
Demo/screenshots
21.
Features
22.
Quick start
23.
Authentication flow
24.
Multi-tenancy
25.
Permissions
26.
Adding a new MCP tool
27.
Protected actions
28.
Audit logging
29.
Deployment
30.
Security considerations
31.
Roadmap
32.
Contributing
33.
About DevStitch
27. DevStitch Positioning
The repository should not be aggressively promotional.
Include a short section near the bottom:
Built by DevStitch
DevStitch helps founders and startup teams turn AI-assisted prototypes and early SaaS products into secure, production-ready platforms, including AI features, MCP integrations and scalable application architecture.
Then link to the DevStitch website/profile.
The code should create the credibility; the CTA should remain subtle.
28. Documentation Requirements
architecture.md
Explain boundaries between:

MCP
DevStitch | MCP SaaS Starter PRD
Page 14

domain/application layer

database

authentication

authorization
authentication.md
Explain OAuth flow and MCP authentication.
authorization.md
Explain tenant isolation and RBAC.
adding-tools.md
Step-by-step example:
“How to expose another SaaS action as an MCP tool.”
This is particularly important.
security.md
Explain:

RLS

secrets

OAuth

rate limits

input validation

audit logs

destructive actions
deployment.md
Show a typical deployment architecture without locking users to one hosting vendor.
29. Public Repository Quality
Repository must include:

MIT License

.env.example

meaningful commit history

CONTRIBUTING.md

SECURITY.md

issue templates

pull request template

CI

linting

formatting

tests

screenshots

architecture diagram

clear documentation
No DevStitch/client credentials or internal project code should be reused.
Everything must be developed specifically for the public repository.
DevStitch | MCP SaaS Starter PRD
Page 15
30. Out of Scope — V1
Do NOT include unless required during implementation:

billing/Stripe;

subscription management;

full admin panel;

complex project management;

RAG;

vector database;

LLM provider integration;

autonomous agents;

MCP client implementation;

custom MCP protocol implementation;

custom OAuth server;

enterprise SSO;

complex workflow engine;

MCP marketplace;

dozens of MCP tools;

mobile application.
Avoid scope creep.
The objective is to demonstrate the architecture extremely well, not maximize feature count.
31. Implementation Milestones
Milestone 1 — SaaS Foundation
Build:

monorepo;

Supabase schema;

organizations;

memberships;

roles;

projects;

tasks;

authentication;

RLS;

minimal UI;

seeded demo environment.
Outcome: Small functioning multi-tenant SaaS.
Milestone 2 — MCP Core
Build:

remote MCP server;

Streamable HTTP endpoint;

OAuth integration;

authenticated MCP identity;

read tools;

write tools;

MCP resources;

application-service integration.
Outcome: An authenticated MCP client can safely interact with the SaaS.
DevStitch | MCP SaaS Starter PRD
Page 16
Milestone 3 — Production Controls
Build:

reusable authorization layer;

tenant enforcement;

validation;

rate limiting;

audit logging;

Agent Activity UI;

protected action workflow;

Pending Actions UI;

structured error handling.
Outcome: Starter demonstrates realistic SaaS production controls rather than only MCP connectivity.
Milestone 4 — OSS Release
Complete:

automated tests;

CI;

README;

architecture diagrams;

screenshots;

documentation;

sample client configuration;

contribution guide;

security policy;

deployment instructions;

repository cleanup.
Outcome: Public-ready DevStitch GitHub repository.
32. Definition of Done
V1 is complete when all of the following are demonstrable:
Scenario 1
A user connects an MCP-compatible client and authenticates using the SaaS account.
Scenario 2
The agent lists projects belonging only to the user's organization.
Scenario 3
The agent retrieves project/task information.
Scenario 4
The agent creates or updates a task.
Scenario 5
A viewer attempts a write operation and is denied.
Scenario 6
A user attempts to access another organization's resource and is denied at both application and database/RLS levels.
DevStitch | MCP SaaS Starter PRD
Page 17
Scenario 7
An agent requests a destructive operation and the system creates a pending approval instead of immediately executing it.
Scenario 8
An administrator approves the pending action.
Scenario 9
The Agent Activity screen shows what the MCP client performed.
Scenario 10
A developer unfamiliar with the codebase can follow the README and run the reference project without undocumented setup.
33. Primary Demo Story
The final repository/demo should tell this story:
A SaaS company already has users, organizations, projects, tasks and permissions.
They want their customers to say to an AI assistant:
“Show me the open tasks in Project Alpha.”
Then:
“Create a task for Sarah to review the landing page.”
The AI can securely do so through MCP.
But if the AI requests:
“Delete this task.”
the application does not blindly execute the destructive operation.
Instead:
“Approval required.”
The SaaS owner can see the request, approve or reject it, and later see the full action inside the audit log.
That single end-to-end demonstration should communicate the value of the entire repository.
34. Product Principle
When making implementation decisions, prioritize:
Security > architectural clarity > developer experience > feature count.
A smaller repository that clearly demonstrates how to add MCP safely to a real SaaS is more valuable to DevStitch than a large starter containing many unrelated features.