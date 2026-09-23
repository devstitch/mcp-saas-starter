-- Row Level Security for multi-tenant isolation.
-- Apply via Supabase Dashboard → SQL Editor (paste and run this file).
-- This repo does not use the Supabase CLI.
--
-- Core rule: tenant access comes from memberships for auth.uid().
-- Never trust a client-supplied organization_id alone.

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER to avoid RLS recursion on memberships)
-- ---------------------------------------------------------------------------

create or replace function public.is_org_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.get_org_role(p_organization_id uuid)
returns public.membership_role
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from public.memberships m
  where m.organization_id = p_organization_id
    and m.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_org_admin(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.role = 'admin'
  );
$$;

-- admin or member (not viewer) — used for task writes and pending protected-action requests
create or replace function public.is_org_writer(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.role in ('admin', 'member')
  );
$$;

revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.get_org_role(uuid) from public;
revoke all on function public.is_org_admin(uuid) from public;
revoke all on function public.is_org_writer(uuid) from public;

grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.get_org_role(uuid) to authenticated;
grant execute on function public.is_org_admin(uuid) to authenticated;
grant execute on function public.is_org_writer(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.mcp_audit_events enable row level security;
alter table public.protected_actions enable row level security;

-- ---------------------------------------------------------------------------
-- organizations
-- SELECT: members only. Writes via service role / later admin flows.
-- ---------------------------------------------------------------------------

create policy organizations_select_member
  on public.organizations
  for select
  to authenticated
  using (public.is_org_member(id));

-- ---------------------------------------------------------------------------
-- memberships
-- ---------------------------------------------------------------------------

create policy memberships_select_self_or_org
  on public.memberships
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_org_member(organization_id)
  );

create policy memberships_insert_admin
  on public.memberships
  for insert
  to authenticated
  with check (public.is_org_admin(organization_id));

create policy memberships_update_admin
  on public.memberships
  for update
  to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

create policy memberships_delete_admin
  on public.memberships
  for delete
  to authenticated
  using (public.is_org_admin(organization_id));

-- ---------------------------------------------------------------------------
-- projects
-- Viewers: SELECT only. Admins: full write.
-- ---------------------------------------------------------------------------

create policy projects_select_member
  on public.projects
  for select
  to authenticated
  using (public.is_org_member(organization_id));

create policy projects_insert_admin
  on public.projects
  for insert
  to authenticated
  with check (public.is_org_admin(organization_id));

create policy projects_update_admin
  on public.projects
  for update
  to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

create policy projects_delete_admin
  on public.projects
  for delete
  to authenticated
  using (public.is_org_admin(organization_id));

-- ---------------------------------------------------------------------------
-- tasks
-- Viewers: SELECT only. Admin/member: INSERT/UPDATE.
-- No DELETE for authenticated — destructive deletes go through protected_actions
-- and are executed with the service role after approval.
-- ---------------------------------------------------------------------------

create policy tasks_select_member
  on public.tasks
  for select
  to authenticated
  using (public.is_org_member(organization_id));

create policy tasks_insert_writer
  on public.tasks
  for insert
  to authenticated
  with check (public.is_org_writer(organization_id));

create policy tasks_update_writer
  on public.tasks
  for update
  to authenticated
  using (public.is_org_writer(organization_id))
  with check (public.is_org_writer(organization_id));

-- ---------------------------------------------------------------------------
-- mcp_audit_events
-- Authenticated users: SELECT own org only.
-- INSERT/UPDATE/DELETE: service role only (bypasses RLS).
-- ---------------------------------------------------------------------------

create policy mcp_audit_events_select_member
  on public.mcp_audit_events
  for select
  to authenticated
  using (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- protected_actions
-- Writers may create pending requests for themselves.
-- Only admins may resolve (update status / approved_by / resolved_at).
-- ---------------------------------------------------------------------------

create policy protected_actions_select_member
  on public.protected_actions
  for select
  to authenticated
  using (public.is_org_member(organization_id));

create policy protected_actions_insert_writer_pending
  on public.protected_actions
  for insert
  to authenticated
  with check (
    public.is_org_writer(organization_id)
    and requested_by = auth.uid()
    and status = 'pending'
    and approved_by is null
    and resolved_at is null
  );

create policy protected_actions_update_admin
  on public.protected_actions
  for update
  to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

create policy protected_actions_delete_admin
  on public.protected_actions
  for delete
  to authenticated
  using (public.is_org_admin(organization_id));
