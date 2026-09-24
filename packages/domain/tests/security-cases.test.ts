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
  NotFoundError,
  createTask,
  getProject,
  listProjects,
  requestDeleteTask,
  updateTask,
} from '../src/index.js';
import { afterAll, describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

config({ path: path.join(repoRoot, '.env.local') });
config({ path: path.join(repoRoot, '.env') });

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
const PASSWORD = 'Password123!';

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
  if (sessionError) throw new Error(sessionError.message);
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
  if (!live) return;
  const service = serviceClient();
  if (createdActionIds.length > 0) {
    await service.from('protected_actions').delete().in('id', createdActionIds);
  }
  if (createdTaskIds.length > 0) {
    await service.from('tasks').delete().in('id', createdTaskIds);
  }
});

describe.skipIf(!live)('PRD security cases', () => {
  it('Cross-tenant read -> Denied', async () => {
    const acme = await signIn('member@acme.example.com');
    const globex = await signIn('member@globex.example.com');
    const globexProjects = await listProjects(globex.client, globex.user);
    const foreign = globexProjects[0];
    if (!foreign) throw new Error('missing globex project');

    const project = await getProject(acme.client, acme.user, foreign.id);
    expect(project).toBeNull();
  });

  it('Cross-tenant write -> Denied', async () => {
    const acme = await signIn('member@acme.example.com');
    const globex = await signIn('member@globex.example.com');
    const globexProjects = await listProjects(globex.client, globex.user);
    const foreignProject = globexProjects[0];
    if (!foreignProject) throw new Error('missing globex project');
    const { data: tasks } = await globex.client
      .from('tasks')
      .select('id, title')
      .eq('project_id', foreignProject.id)
      .limit(1);
    const foreign = tasks?.[0];
    if (!foreign) throw new Error('missing globex task');

    await expect(
      updateTask(acme.client, acme.user, foreign.id, { title: 'cross-tenant write' }),
    ).rejects.toBeInstanceOf(NotFoundError);

    const { data: unchanged } = await serviceClient()
      .from('tasks')
      .select('title')
      .eq('id', foreign.id)
      .single();
    expect(unchanged?.title).toBe(foreign.title);
  });

  it('Viewer write (create_task) -> Denied', async () => {
    const viewer = await signIn('viewer@acme.example.com');
    const projects = await listProjects(viewer.client, viewer.user);
    const project = projects[0];
    if (!project) throw new Error('missing project');

    await expect(
      createTask(viewer.client, viewer.user, {
        projectId: project.id,
        title: 'viewer must not create',
      }),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it('Unauthorized destructive action (member invokes delete_task) -> Denied', async () => {
    const member = await signIn('member@acme.example.com');
    const projects = await listProjects(member.client, member.user);
    const project = projects[0];
    if (!project) throw new Error('missing project');
    const { data: tasks } = await member.client
      .from('tasks')
      .select('id')
      .eq('project_id', project.id)
      .limit(1);
    const task = tasks?.[0];
    if (!task) throw new Error('missing task');

    await expect(requestDeleteTask(member.client, member.user, task.id)).rejects.toBeInstanceOf(
      AuthorizationError,
    );
  });

  it('Admin destructive action (admin invokes delete_task) -> Pending approval (not immediate delete)', async () => {
    const admin = await signIn('admin@acme.example.com');
    const projects = await listProjects(admin.client, admin.user);
    const project = projects[0];
    if (!project) throw new Error('missing project');
    const task = await createTask(admin.client, admin.user, {
      projectId: project.id,
      title: `Security pending ${Date.now()}`,
    });
    createdTaskIds.push(task.id);

    const action = await requestDeleteTask(admin.client, admin.user, task.id);
    createdActionIds.push(action.id);

    expect(action.status).toBe('pending');
    const { data: stillThere } = await serviceClient()
      .from('tasks')
      .select('id')
      .eq('id', task.id)
      .maybeSingle();
    expect(stillThere?.id).toBe(task.id);
  });
});

describe.skipIf(!live)('authenticated tool call', () => {
  it('authenticated tool call succeeds', async () => {
    const member = await signIn('member@acme.example.com');
    const projects = await listProjects(member.client, member.user);
    const project = projects[0];
    if (!project) throw new Error('missing project');

    const task = await createTask(member.client, member.user, {
      projectId: project.id,
      title: `Authenticated create ${Date.now()}`,
    });
    createdTaskIds.push(task.id);
    expect(task.organization_id).toBe(member.user.organizationId);
    expect(task.status).toBe('todo');
  });
});
