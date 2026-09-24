import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { resolveUserContext, type UserContext } from '@mcp-saas-starter/auth';
import { AuthorizationError } from '@mcp-saas-starter/authorization';
import {
  createSupabaseClient,
  type AppSupabaseClient,
  type Database,
} from '@mcp-saas-starter/database';
import {
  createTask,
  listProjects,
  requestDeleteTask,
  resolveProtectedAction,
} from '../src/index.js';
import { afterAll, describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

config({ path: path.join(repoRoot, '.env.local') });
config({ path: path.join(repoRoot, '.env') });

const PASSWORD = 'Password123!';

const live = ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY'].every((name) =>
  Boolean(process.env[name]),
);

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const supabaseUrl = live ? required('SUPABASE_URL') : '';
const publishableKey = live ? required('SUPABASE_PUBLISHABLE_KEY') : '';
const secretKey = live ? required('SUPABASE_SECRET_KEY') : '';

async function signIn(email: string): Promise<{ client: AppSupabaseClient; user: UserContext }> {
  const authClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await authClient.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (error || !data.session || !data.user) {
    throw new Error(`Sign-in failed for ${email}: ${error?.message ?? 'no session'}`);
  }

  const client = createSupabaseClient(supabaseUrl, publishableKey);
  const { error: sessionError } = await client.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
  if (sessionError) {
    throw new Error(`setSession failed for ${email}: ${sessionError.message}`);
  }

  const user = await resolveUserContext(client, data.user.id);
  if (!user) throw new Error(`${email} has no organization membership`);
  return { client, user };
}

function serviceClient(): AppSupabaseClient {
  return createClient<Database>(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const createdTaskIds: string[] = [];
const createdActionIds: string[] = [];

afterAll(async () => {
  const service = serviceClient();
  if (createdActionIds.length > 0) {
    await service.from('protected_actions').delete().in('id', createdActionIds);
  }
  if (createdTaskIds.length > 0) {
    await service.from('tasks').delete().in('id', createdTaskIds);
  }
});

async function acmeProjectId(client: AppSupabaseClient, user: UserContext): Promise<string> {
  const projects = await listProjects(client, user);
  const project = projects[0];
  if (!project) throw new Error('missing acme project');
  return project.id;
}

describe.skipIf(!live)('delete_task protected action', () => {
  it('denies a member before creating a pending action', async () => {
    const member = await signIn('member@acme.example.com');
    const admin = await signIn('admin@acme.example.com');
    const task = await createTask(admin.client, admin.user, {
      projectId: await acmeProjectId(admin.client, admin.user),
      title: `Prompt 13 member deny ${Date.now()}`,
    });
    createdTaskIds.push(task.id);

    const service = serviceClient();
    const { count: before } = await service
      .from('protected_actions')
      .select('id', { count: 'exact', head: true })
      .eq('requested_by', member.user.userId);

    await expect(requestDeleteTask(member.client, member.user, task.id)).rejects.toBeInstanceOf(
      AuthorizationError,
    );

    const { count: after } = await service
      .from('protected_actions')
      .select('id', { count: 'exact', head: true })
      .eq('requested_by', member.user.userId);

    expect(after).toBe(before);
    const { data: stillThere } = await service
      .from('tasks')
      .select('id')
      .eq('id', task.id)
      .maybeSingle();
    expect(stillThere?.id).toBe(task.id);
  });

  it('returns pending approval for an admin and does not delete the task', async () => {
    const admin = await signIn('admin@acme.example.com');
    const task = await createTask(admin.client, admin.user, {
      projectId: await acmeProjectId(admin.client, admin.user),
      title: `Prompt 13 pending ${Date.now()}`,
    });
    createdTaskIds.push(task.id);

    const action = await requestDeleteTask(admin.client, admin.user, task.id);
    createdActionIds.push(action.id);

    expect(action.status).toBe('pending');
    expect(action.tool_name).toBe('delete_task');
    expect(action.organization_id).toBe(admin.user.organizationId);

    const { data: stillThere } = await serviceClient()
      .from('tasks')
      .select('id')
      .eq('id', task.id)
      .maybeSingle();
    expect(stillThere?.id).toBe(task.id);
  });

  it('deletes the task only after an admin approves', async () => {
    const admin = await signIn('admin@acme.example.com');
    const task = await createTask(admin.client, admin.user, {
      projectId: await acmeProjectId(admin.client, admin.user),
      title: `Prompt 13 approve ${Date.now()}`,
    });
    createdTaskIds.push(task.id);

    const action = await requestDeleteTask(admin.client, admin.user, task.id);
    createdActionIds.push(action.id);

    await resolveProtectedAction(admin.client, serviceClient(), admin.user, action.id, 'approved');

    const { data: gone } = await serviceClient()
      .from('tasks')
      .select('id')
      .eq('id', task.id)
      .maybeSingle();
    expect(gone).toBeNull();

    const { data: resolved } = await serviceClient()
      .from('protected_actions')
      .select('status, approved_by, resolved_at')
      .eq('id', action.id)
      .single();
    expect(resolved?.status).toBe('approved');
    expect(resolved?.approved_by).toBe(admin.user.userId);
    expect(resolved?.resolved_at).toBeTruthy();
  });

  it('keeps the task when an admin rejects, and denies a member resolve', async () => {
    const admin = await signIn('admin@acme.example.com');
    const member = await signIn('member@acme.example.com');
    const task = await createTask(admin.client, admin.user, {
      projectId: await acmeProjectId(admin.client, admin.user),
      title: `Prompt 13 reject ${Date.now()}`,
    });
    createdTaskIds.push(task.id);

    const action = await requestDeleteTask(admin.client, admin.user, task.id);
    createdActionIds.push(action.id);

    await expect(
      resolveProtectedAction(member.client, serviceClient(), member.user, action.id, 'approved'),
    ).rejects.toBeInstanceOf(AuthorizationError);

    const { data: stillPending } = await serviceClient()
      .from('protected_actions')
      .select('status')
      .eq('id', action.id)
      .single();
    expect(stillPending?.status).toBe('pending');

    await resolveProtectedAction(admin.client, serviceClient(), admin.user, action.id, 'rejected');

    const { data: stillThere } = await serviceClient()
      .from('tasks')
      .select('title')
      .eq('id', task.id)
      .maybeSingle();
    expect(stillThere?.title).toBe(task.title);

    const { data: resolved } = await serviceClient()
      .from('protected_actions')
      .select('status')
      .eq('id', action.id)
      .single();
    expect(resolved?.status).toBe('rejected');
  });
});
