import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { resolveUserContext, type UserContext } from '@mcp-saas-starter/auth';
import { createSupabaseClient, type AppSupabaseClient } from '@mcp-saas-starter/database';
import {
  NotFoundError,
  getCurrentOrganization,
  getProjectContext,
  listProjects,
} from '../src/index.js';
import { describe, expect, it } from 'vitest';

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

describe.skipIf(!live)('MCP resource context', () => {
  it('returns project context for a project in the caller organization', async () => {
    const { client, user } = await signIn('member@acme.example.com');
    const projects = await listProjects(client, user);
    const project = projects[0];
    if (!project) throw new Error('missing project');

    const context = await getProjectContext(client, user, project.id);
    expect(context.id).toBe(project.id);
    expect(context.name).toBe(project.name);
    expect(context.status).toBe(project.status);
    expect(context.taskCount).toBeGreaterThanOrEqual(0);
    expect(Object.keys(context).sort()).toEqual(
      ['description', 'id', 'name', 'status', 'taskCount'].sort(),
    );
  });

  it('hides another organization project', async () => {
    const acme = await signIn('member@acme.example.com');
    const globex = await signIn('member@globex.example.com');
    const globexProjects = await listProjects(globex.client, globex.user);
    const foreign = globexProjects[0];
    if (!foreign) throw new Error('missing globex project');

    await expect(getProjectContext(acme.client, acme.user, foreign.id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('returns organization counts without member details', async () => {
    const { client, user } = await signIn('viewer@acme.example.com');
    const organization = await getCurrentOrganization(client, user);

    expect(organization.id).toBe(user.organizationId);
    expect(organization.name).toBe('Acme Inc');
    expect(organization.memberCount).toBeGreaterThanOrEqual(3);
    expect(organization.projectCount).toBeGreaterThanOrEqual(1);
    expect(Object.keys(organization).sort()).toEqual(
      ['id', 'memberCount', 'name', 'projectCount'].sort(),
    );
  });
});
