import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { resolveUserContext, type UserContext } from '@mcp-saas-starter/auth';
import {
  createSupabaseClient,
  type AppSupabaseClient,
  type Database,
} from '@mcp-saas-starter/database';
import { createTask, listProjects, updateTask } from '@mcp-saas-starter/domain';
import { afterAll, describe, expect, it } from 'vitest';
import { captureAudit, createAuditSink, summarizeInput } from '../src/index.js';

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
const createdAuditIds: string[] = [];

afterAll(async () => {
  const service = serviceClient();
  if (createdAuditIds.length > 0) {
    await service.from('mcp_audit_events').delete().in('id', createdAuditIds);
  }
  if (createdTaskIds.length > 0) {
    await service.from('tasks').delete().in('id', createdTaskIds);
  }
});

describe('summarizeInput', () => {
  it('keeps a short title and drops the description', () => {
    const summary = summarizeInput({
      title: 'Visible title',
      description: 'secret notes that must not be stored',
      projectId: 'project-1',
    });
    expect(summary).toEqual({ title: 'Visible title', projectId: 'project-1' });
  });
});

describe.skipIf(!live)('audit events', () => {
  it('records one success event for create_task and a denied event for a cross-tenant update', async () => {
    const acme = await signIn('member@acme.example.com');
    const globex = await signIn('member@globex.example.com');
    const projects = await listProjects(acme.client, acme.user);
    const project = projects[0];
    if (!project) throw new Error('missing project');

    const title = `Audit create ${Date.now()}`;
    const sink = createAuditSink();
    const task = await captureAudit({
      sink,
      toolName: 'create_task',
      actionType: 'tool',
      input: { projectId: project.id, title, description: 'do not store this' },
      work: () => createTask(acme.client, acme.user, { projectId: project.id, title }),
    });
    createdTaskIds.push(task.id);

    const globexProjects = await listProjects(globex.client, globex.user);
    const foreign = globexProjects[0];
    if (!foreign) throw new Error('missing globex project');
    const { data: foreignTasks } = await globex.client
      .from('tasks')
      .select('id')
      .eq('project_id', foreign.id)
      .limit(1);
    const foreignTaskId = foreignTasks?.[0]?.id;
    if (!foreignTaskId) throw new Error('missing globex task');

    await expect(
      captureAudit({
        sink,
        toolName: 'update_task',
        actionType: 'tool',
        input: { taskId: foreignTaskId, title: 'should not apply' },
        work: () =>
          updateTask(acme.client, acme.user, foreignTaskId, { title: 'should not apply' }),
      }),
    ).rejects.toThrow();

    expect(sink.events).toHaveLength(2);
    expect(sink.events[0]?.toolName).toBe('create_task');
    expect(sink.events[0]?.resultStatus).toBe('success');
    expect(JSON.stringify(sink.events[0]?.inputMetadata)).not.toContain('do not store');
    expect(sink.events[1]?.toolName).toBe('update_task');
    expect(sink.events[1]?.resultStatus).toBe('denied');

    const service = serviceClient();
    const { data, error } = await service
      .from('mcp_audit_events')
      .insert(
        sink.events.map((event) => ({
          organization_id: acme.user.organizationId,
          user_id: acme.user.userId,
          client_id: 'test-client',
          tool_name: event.toolName,
          action_type: event.actionType,
          input_metadata: event.inputMetadata,
          result_status: event.resultStatus,
          execution_time_ms: event.executionTimeMs,
        })),
      )
      .select('id, tool_name, result_status');
    if (error || !data) throw new Error(error?.message ?? 'audit insert failed');
    createdAuditIds.push(...data.map((row) => row.id));

    const created = data.filter((row) => row.tool_name === 'create_task');
    const denied = data.filter((row) => row.tool_name === 'update_task');
    expect(created).toHaveLength(1);
    expect(created[0]?.result_status).toBe('success');
    expect(denied).toHaveLength(1);
    expect(denied[0]?.result_status).toBe('denied');
  });
});
