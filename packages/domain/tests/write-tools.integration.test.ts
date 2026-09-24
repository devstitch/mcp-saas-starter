import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { resolveUserContext, type UserContext } from '@mcp-saas-starter/auth';
import { authorize, AuthorizationError } from '@mcp-saas-starter/authorization';
import {
  createSupabaseClient,
  type AppSupabaseClient,
  type Database,
} from '@mcp-saas-starter/database';
import {
  NotFoundError,
  ValidationError,
  assignTask,
  createTask,
  listProjects,
  listTasks,
  updateTask,
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

afterAll(async () => {
  if (createdTaskIds.length === 0) return;
  const service = serviceClient();
  await service.from('tasks').delete().in('id', createdTaskIds);
});

describe.skipIf(!live)('write tools against the live project', () => {
  it('lets a member create a task in their own organization project', async () => {
    const { client, user } = await signIn('member@acme.example.com');
    const projects = await listProjects(client, user);
    expect(projects.length).toBeGreaterThan(0);
    const project = projects[0];
    if (!project) throw new Error('missing project');

    const task = await createTask(client, user, {
      projectId: project.id,
      title: `Prompt 12 member create ${Date.now()}`,
    });
    createdTaskIds.push(task.id);

    expect(task.organization_id).toBe(user.organizationId);
    expect(task.project_id).toBe(project.id);
    expect(task.status).toBe('todo');
  });

  it('denies a viewer creating a task', async () => {
    const { client, user } = await signIn('viewer@acme.example.com');
    const projects = await listProjects(client, user);
    const project = projects[0];
    if (!project) throw new Error('missing project');

    await expect(
      createTask(client, user, {
        projectId: project.id,
        title: 'Viewer should not create this',
      }),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it('denies a cross-tenant update at authorize() and at RLS', async () => {
    const acme = await signIn('member@acme.example.com');
    const globex = await signIn('member@globex.example.com');
    const globexProjects = await listProjects(globex.client, globex.user);
    const globexProject = globexProjects[0];
    if (!globexProject) throw new Error('missing globex project');
    const globexTasks = await listTasks(globex.client, globex.user, globexProject.id);
    const globexTask = globexTasks[0];
    if (!globexTask) throw new Error('missing globex task');

    expect(() =>
      authorize(acme.user, 'task:update', { organizationId: globex.user.organizationId }),
    ).toThrow(AuthorizationError);

    await expect(
      updateTask(acme.client, acme.user, globexTask.id, { title: 'Cross-tenant edit' }),
    ).rejects.toBeInstanceOf(NotFoundError);

    const { data, error } = await acme.client
      .from('tasks')
      .update({ title: 'RLS bypass attempt' })
      .eq('id', globexTask.id)
      .select('id, title');

    const denied = error != null || data == null || (Array.isArray(data) && data.length === 0);
    expect(denied).toBe(true);

    const { data: unchanged } = await serviceClient()
      .from('tasks')
      .select('title')
      .eq('id', globexTask.id)
      .single();
    expect(unchanged?.title).toBe(globexTask.title);
  });

  it('assigns a task only to a member of the same organization', async () => {
    const acme = await signIn('member@acme.example.com');
    const globex = await signIn('member@globex.example.com');
    const projects = await listProjects(acme.client, acme.user);
    const project = projects[0];
    if (!project) throw new Error('missing project');

    const task = await createTask(acme.client, acme.user, {
      projectId: project.id,
      title: `Prompt 12 assign ${Date.now()}`,
    });
    createdTaskIds.push(task.id);

    const { data: members, error } = await acme.client
      .from('memberships')
      .select('user_id')
      .eq('organization_id', acme.user.organizationId);
    if (error) throw new Error(error.message);
    const teammate = members?.find((member) => member.user_id !== acme.user.userId);
    if (!teammate) throw new Error('missing acme teammate');

    const assigned = await assignTask(acme.client, acme.user, task.id, teammate.user_id);
    expect(assigned.assignee_id).toBe(teammate.user_id);

    await expect(
      assignTask(acme.client, acme.user, task.id, globex.user.userId),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
