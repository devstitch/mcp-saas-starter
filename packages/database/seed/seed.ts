/**
 * Demo seed for MCP SaaS Starter (Prompt 4).
 *
 * Why TypeScript (not only SQL):
 * - Auth users live in auth.users and must be created via the Admin API.
 * - This project does not use the Supabase CLI.
 *
 * Prerequisites:
 * - Schema + RLS migrations applied in the Supabase SQL Editor
 * - .env.local with SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY
 *
 * Run from repo root:
 *   pnpm db:seed
 *
 * Safe to re-run (idempotent): users/orgs/memberships are upserted; demo
 * projects/tasks for Acme + Globex are replaced each run.
 *
 * Demo password for all users: Password123!
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { Database, MembershipRole, ProjectStatus, TaskStatus } from '../src/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

config({ path: path.join(repoRoot, '.env.local') });
config({ path: path.join(repoRoot, '.env') });

const DEMO_PASSWORD = 'Password123!';

type AppClient = SupabaseClient<Database>;

type SeedUser = {
  email: string;
  role: MembershipRole;
  org: 'acme' | 'globex';
};

type SeedProject = {
  name: string;
  description: string;
  status: ProjectStatus;
};

const USERS: SeedUser[] = [
  { email: 'admin@acme.example.com', role: 'admin', org: 'acme' },
  { email: 'member@acme.example.com', role: 'member', org: 'acme' },
  { email: 'viewer@acme.example.com', role: 'viewer', org: 'acme' },
  { email: 'admin@globex.example.com', role: 'admin', org: 'globex' },
  { email: 'member@globex.example.com', role: 'member', org: 'globex' },
];

const ACME_PROJECTS: SeedProject[] = [
  {
    name: 'Project Alpha',
    description: 'Landing page and onboarding for Acme.',
    status: 'active',
  },
  {
    name: 'Project Beta',
    description: 'Billing integrations (on hold).',
    status: 'on_hold',
  },
  {
    name: 'Project Gamma',
    description: 'Completed migration workstream.',
    status: 'completed',
  },
  {
    name: 'Project Delta',
    description: 'Archived prototype.',
    status: 'archived',
  },
];

const GLOBEX_PROJECTS: SeedProject[] = [
  {
    name: 'Globex Launch',
    description: 'Public launch checklist.',
    status: 'active',
  },
  {
    name: 'Globex Infra',
    description: 'Infrastructure hardening.',
    status: 'on_hold',
  },
  {
    name: 'Globex Support',
    description: 'Support tooling rollout.',
    status: 'completed',
  },
  {
    name: 'Globex Archive',
    description: 'Old experiments.',
    status: 'archived',
  },
];

const TASK_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'blocked', 'done'];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Set it in .env.local before seeding.`);
  }
  return value;
}

function createServiceClient(): AppClient {
  return createClient<Database>(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SECRET_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function findUserByEmail(service: AppClient, email: string): Promise<User | null> {
  const perPage = 200;
  let page = 1;

  for (;;) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`listUsers failed: ${error.message}`);

    const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;

    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function ensureUser(service: AppClient, email: string): Promise<string> {
  const existing = await findUserByEmail(service, email);
  if (existing) {
    // Keep password in sync so re-seed always restores the documented demo password.
    const { error } = await service.auth.admin.updateUserById(existing.id, {
      password: DEMO_PASSWORD,
      email_confirm: true,
    });
    if (error) throw new Error(`updateUser ${email} failed: ${error.message}`);
    return existing.id;
  }

  const { data, error } = await service.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`createUser ${email} failed: ${error?.message ?? 'unknown'}`);
  }
  return data.user.id;
}

async function ensureOrganization(service: AppClient, name: string): Promise<string> {
  const { data: existing, error: selectError } = await service
    .from('organizations')
    .select('id')
    .eq('name', name)
    .maybeSingle();

  if (selectError) throw new Error(`select org ${name} failed: ${selectError.message}`);
  if (existing) return existing.id;

  const { data: created, error: insertError } = await service
    .from('organizations')
    .insert({ name })
    .select('id')
    .single();

  if (insertError || !created) {
    throw new Error(`insert org ${name} failed: ${insertError?.message ?? 'unknown'}`);
  }
  return created.id;
}

async function ensureMembership(
  service: AppClient,
  userId: string,
  organizationId: string,
  role: MembershipRole,
) {
  const { error } = await service.from('memberships').upsert(
    {
      user_id: userId,
      organization_id: organizationId,
      role,
    },
    { onConflict: 'user_id,organization_id' },
  );
  if (error) throw new Error(`membership upsert failed: ${error.message}`);
}

function buildTasksForProject(args: {
  projectId: string;
  organizationId: string;
  projectName: string;
  createdBy: string;
  memberIds: string[];
}) {
  const { projectId, organizationId, projectName, createdBy, memberIds } = args;
  const tasks = [];

  for (let i = 1; i <= 8; i += 1) {
    const status = TASK_STATUSES[(i - 1) % TASK_STATUSES.length]!;
    // Mix assigned / unassigned: every 3rd task unassigned
    const assigneeId = i % 3 === 0 ? null : memberIds[(i - 1) % memberIds.length]!;

    tasks.push({
      project_id: projectId,
      organization_id: organizationId,
      title: `${projectName} — Task ${i}`,
      description: `Seeded task ${i} for ${projectName} (${status}).`,
      status,
      assignee_id: assigneeId,
      created_by: createdBy,
    });
  }

  return tasks;
}

async function replaceProjectsAndTasks(
  service: AppClient,
  args: {
    organizationId: string;
    projects: SeedProject[];
    adminId: string;
    assigneePool: string[];
  },
) {
  const { organizationId, projects, adminId, assigneePool } = args;

  // Cascades to tasks via FK
  const { error: deleteError } = await service
    .from('projects')
    .delete()
    .eq('organization_id', organizationId);
  if (deleteError) throw new Error(`delete projects failed: ${deleteError.message}`);

  for (const project of projects) {
    const { data: created, error } = await service
      .from('projects')
      .insert({
        organization_id: organizationId,
        name: project.name,
        description: project.description,
        status: project.status,
        created_by: adminId,
      })
      .select('id, name')
      .single();

    if (error || !created) {
      throw new Error(`insert project ${project.name} failed: ${error?.message ?? 'unknown'}`);
    }

    const taskRows = buildTasksForProject({
      projectId: created.id,
      organizationId,
      projectName: created.name,
      createdBy: adminId,
      memberIds: assigneePool,
    });

    const { error: taskError } = await service.from('tasks').insert(taskRows);
    if (taskError) {
      throw new Error(`insert tasks for ${project.name} failed: ${taskError.message}`);
    }
  }
}

async function main() {
  const service = createServiceClient();

  console.log('Seeding demo users…');
  const userIds = new Map<string, string>();
  for (const user of USERS) {
    const id = await ensureUser(service, user.email);
    userIds.set(user.email, id);
    console.log(`  ✓ ${user.email}`);
  }

  console.log('Seeding organizations…');
  const acmeId = await ensureOrganization(service, 'Acme Inc');
  const globexId = await ensureOrganization(service, 'Globex Corp');
  console.log(`  ✓ Acme Inc (${acmeId})`);
  console.log(`  ✓ Globex Corp (${globexId})`);

  console.log('Seeding memberships…');
  for (const user of USERS) {
    const orgId = user.org === 'acme' ? acmeId : globexId;
    await ensureMembership(service, userIds.get(user.email)!, orgId, user.role);
    console.log(`  ✓ ${user.email} → ${user.org} (${user.role})`);
  }

  const acmeAdminId = userIds.get('admin@acme.example.com')!;
  const acmeMemberId = userIds.get('member@acme.example.com')!;
  const globexAdminId = userIds.get('admin@globex.example.com')!;
  const globexMemberId = userIds.get('member@globex.example.com')!;

  console.log('Replacing Acme projects/tasks…');
  await replaceProjectsAndTasks(service, {
    organizationId: acmeId,
    projects: ACME_PROJECTS,
    adminId: acmeAdminId,
    assigneePool: [acmeAdminId, acmeMemberId],
  });

  console.log('Replacing Globex projects/tasks…');
  await replaceProjectsAndTasks(service, {
    organizationId: globexId,
    projects: GLOBEX_PROJECTS,
    adminId: globexAdminId,
    assigneePool: [globexAdminId, globexMemberId],
  });

  console.log('\nSeed complete.');
  console.log('Demo password for all users: Password123!');
  console.log('Users:');
  for (const user of USERS) {
    console.log(`  - ${user.email} (${user.role} @ ${user.org})`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
