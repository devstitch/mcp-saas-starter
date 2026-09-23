-- Initial multi-tenant SaaS schema for MCP SaaS Starter.
-- No RLS policies in this migration (added in a later prompt).
--
-- Apply via Supabase Dashboard → SQL Editor (paste and run this file).
-- This repo does not use the Supabase CLI.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.membership_role as enum ('admin', 'member', 'viewer');

create type public.project_status as enum (
  'active',
  'on_hold',
  'completed',
  'archived'
);

create type public.task_status as enum (
  'todo',
  'in_progress',
  'blocked',
  'done'
);

create type public.protected_action_status as enum (
  'pending',
  'approved',
  'rejected'
);

create type public.mcp_audit_result_status as enum (
  'success',
  'error',
  'denied',
  'pending'
);

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index organizations_created_at_idx on public.organizations (created_at desc);

-- ---------------------------------------------------------------------------
-- memberships
-- ---------------------------------------------------------------------------

create table public.memberships (
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  role public.membership_role not null default 'member',
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, organization_id)
);

create index memberships_organization_id_idx on public.memberships (organization_id);
create index memberships_user_id_idx on public.memberships (user_id);

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  status public.project_status not null default 'active',
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index projects_organization_id_idx on public.projects (organization_id);
create index projects_created_by_idx on public.projects (created_by);
create index projects_status_idx on public.projects (status);

create trigger projects_set_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- tasks
-- organization_id is denormalized for simpler RLS / tenant-scoped queries.
-- ---------------------------------------------------------------------------

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  description text,
  status public.task_status not null default 'todo',
  assignee_id uuid references auth.users (id) on delete set null,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tasks_title_not_blank check (char_length(trim(title)) > 0)
);

create index tasks_organization_id_idx on public.tasks (organization_id);
create index tasks_project_id_idx on public.tasks (project_id);
create index tasks_assignee_id_idx on public.tasks (assignee_id);
create index tasks_created_by_idx on public.tasks (created_by);
create index tasks_status_idx on public.tasks (status);

create trigger tasks_set_updated_at
before update on public.tasks
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- mcp_audit_events
-- input_metadata must never contain raw sensitive payloads.
-- ---------------------------------------------------------------------------

create table public.mcp_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id text,
  tool_name text not null,
  action_type text not null,
  input_metadata jsonb not null default '{}'::jsonb,
  result_status public.mcp_audit_result_status not null,
  execution_time_ms integer,
  created_at timestamptz not null default timezone('utc', now()),
  constraint mcp_audit_events_execution_time_non_negative
    check (execution_time_ms is null or execution_time_ms >= 0)
);

create index mcp_audit_events_organization_id_idx
  on public.mcp_audit_events (organization_id);
create index mcp_audit_events_user_id_idx on public.mcp_audit_events (user_id);
create index mcp_audit_events_created_at_idx
  on public.mcp_audit_events (created_at desc);
create index mcp_audit_events_tool_name_idx on public.mcp_audit_events (tool_name);

-- ---------------------------------------------------------------------------
-- protected_actions
-- ---------------------------------------------------------------------------

create table public.protected_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  requested_by uuid not null references auth.users (id) on delete cascade,
  tool_name text not null,
  payload jsonb not null default '{}'::jsonb,
  status public.protected_action_status not null default 'pending',
  approved_by uuid references auth.users (id) on delete set null,
  requested_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  constraint protected_actions_resolved_at_when_resolved check (
    (status = 'pending' and resolved_at is null)
    or (status <> 'pending' and resolved_at is not null)
  )
);

create index protected_actions_organization_id_idx
  on public.protected_actions (organization_id);
create index protected_actions_requested_by_idx
  on public.protected_actions (requested_by);
create index protected_actions_status_idx on public.protected_actions (status);
create index protected_actions_requested_at_idx
  on public.protected_actions (requested_at desc);

comment on column public.mcp_audit_events.input_metadata is
  'Redacted/summarized tool input only. Never store raw sensitive payloads.';

comment on column public.tasks.organization_id is
  'Denormalized tenant key for RLS and tenant-scoped queries.';
