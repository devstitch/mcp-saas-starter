/**
 * RLS denial tests (PRD Prompt 3).
 *
 * Prerequisites:
 * 1. Apply supabase/migrations/20260922120000_initial_schema.sql
 * 2. Apply supabase/migrations/20260923120000_rls_policies.sql
 * 3. Set SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY in .env.local
 *
 * Run: pnpm --filter @mcp-saas-starter/database test
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createAuthedClient,
  createServiceClient,
  createTestUser,
  deleteTestUser,
  isDenied,
  type AppSupabaseClient,
  type TestUser,
} from './helpers.js';

const RUN_ID = Date.now().toString(36);
const PASSWORD = 'TestPassword123!';

describe('RLS multi-tenant denials', () => {
  let service: AppSupabaseClient;

  let orgAId: string;
  let orgBId: string;
  let projectAId: string;
  let projectBId: string;
  let taskBId: string;
  let protectedActionId: string;

  let adminA: TestUser;
  let memberA: TestUser;
  let viewerA: TestUser;
  let adminB: TestUser;

  beforeAll(async () => {
    service = createServiceClient();

    adminA = await createTestUser(service, `rls-admin-a-${RUN_ID}@example.com`, PASSWORD);
    memberA = await createTestUser(service, `rls-member-a-${RUN_ID}@example.com`, PASSWORD);
    viewerA = await createTestUser(service, `rls-viewer-a-${RUN_ID}@example.com`, PASSWORD);
    adminB = await createTestUser(service, `rls-admin-b-${RUN_ID}@example.com`, PASSWORD);

    const { data: orgA, error: orgAError } = await service
      .from('organizations')
      .insert({ name: `RLS Org A ${RUN_ID}` })
      .select('id')
      .single();
    if (orgAError || !orgA) throw new Error(orgAError?.message ?? 'org A insert failed');
    orgAId = orgA.id;

    const { data: orgB, error: orgBError } = await service
      .from('organizations')
      .insert({ name: `RLS Org B ${RUN_ID}` })
      .select('id')
      .single();
    if (orgBError || !orgB) throw new Error(orgBError?.message ?? 'org B insert failed');
    orgBId = orgB.id;

    const { error: membershipError } = await service.from('memberships').insert([
      { user_id: adminA.id, organization_id: orgAId, role: 'admin' },
      { user_id: memberA.id, organization_id: orgAId, role: 'member' },
      { user_id: viewerA.id, organization_id: orgAId, role: 'viewer' },
      { user_id: adminB.id, organization_id: orgBId, role: 'admin' },
    ]);
    if (membershipError) throw new Error(membershipError.message);

    const { data: projectA, error: projectAError } = await service
      .from('projects')
      .insert({
        organization_id: orgAId,
        name: `Project A ${RUN_ID}`,
        created_by: adminA.id,
      })
      .select('id')
      .single();
    if (projectAError || !projectA) throw new Error(projectAError?.message ?? 'project A failed');
    projectAId = projectA.id;

    const { data: projectB, error: projectBError } = await service
      .from('projects')
      .insert({
        organization_id: orgBId,
        name: `Project B ${RUN_ID}`,
        created_by: adminB.id,
      })
      .select('id')
      .single();
    if (projectBError || !projectB) throw new Error(projectBError?.message ?? 'project B failed');
    projectBId = projectB.id;

    const { data: taskB, error: taskBError } = await service
      .from('tasks')
      .insert({
        project_id: projectBId,
        organization_id: orgBId,
        title: `Task B ${RUN_ID}`,
        created_by: adminB.id,
      })
      .select('id')
      .single();
    if (taskBError || !taskB) throw new Error(taskBError?.message ?? 'task B failed');
    taskBId = taskB.id;

    const { data: protectedAction, error: protectedError } = await service
      .from('protected_actions')
      .insert({
        organization_id: orgAId,
        requested_by: adminA.id,
        tool_name: 'delete_task',
        payload: { taskId: 'placeholder' },
        status: 'pending',
      })
      .select('id')
      .single();
    if (protectedError || !protectedAction) {
      throw new Error(protectedError?.message ?? 'protected_action insert failed');
    }
    protectedActionId = protectedAction.id;
  }, 60_000);

  afterAll(async () => {
    if (!service) return;

    if (orgAId) await service.from('organizations').delete().eq('id', orgAId);
    if (orgBId) await service.from('organizations').delete().eq('id', orgBId);

    for (const user of [adminA, memberA, viewerA, adminB]) {
      if (user?.id) await deleteTestUser(service, user.id);
    }
  }, 60_000);

  it('1. Organization A cannot SELECT Organization B projects', async () => {
    const client = await createAuthedClient(adminA);

    const { data, error } = await client
      .from('projects')
      .select('id, organization_id')
      .eq('id', projectBId);

    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);

    const { data: allVisible, error: listError } = await client.from('projects').select('id');
    expect(listError).toBeNull();
    const ids = (allVisible ?? []).map((row) => row.id);
    expect(ids).toContain(projectAId);
    expect(ids).not.toContain(projectBId);
  });

  it('2. Organization A cannot UPDATE Organization B tasks', async () => {
    const client = await createAuthedClient(adminA);

    const { data, error } = await client
      .from('tasks')
      .update({ title: 'Hijacked by Org A' })
      .eq('id', taskBId)
      .select('id');

    expect(isDenied(error, data)).toBe(true);

    const { data: stillOriginal } = await service
      .from('tasks')
      .select('title')
      .eq('id', taskBId)
      .single();
    expect(stillOriginal?.title).toBe(`Task B ${RUN_ID}`);
  });

  it('3. A viewer-role user cannot INSERT into tasks', async () => {
    const client = await createAuthedClient(viewerA);

    const { data, error } = await client
      .from('tasks')
      .insert({
        project_id: projectAId,
        organization_id: orgAId,
        title: `Viewer should not create ${RUN_ID}`,
        created_by: viewerA.id,
      })
      .select('id');

    expect(isDenied(error, data)).toBe(true);
  });

  it('4. A member without admin role cannot resolve a protected_action', async () => {
    const client = await createAuthedClient(memberA);

    const { data, error } = await client
      .from('protected_actions')
      .update({
        status: 'approved',
        approved_by: memberA.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', protectedActionId)
      .select('id, status');

    expect(isDenied(error, data)).toBe(true);

    const { data: stillPending } = await service
      .from('protected_actions')
      .select('status, approved_by')
      .eq('id', protectedActionId)
      .single();
    expect(stillPending?.status).toBe('pending');
    expect(stillPending?.approved_by).toBeNull();
  });
});
