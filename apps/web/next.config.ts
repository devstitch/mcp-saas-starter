import path from 'path';
import { config as loadDotenv } from 'dotenv';
import type { NextConfig } from 'next';

// Load monorepo-root env so apps/web uses the same .env.local as seed/tests.
loadDotenv({ path: path.join(__dirname, '../../.env.local') });
loadDotenv({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing required env var: SUPABASE_URL');
}
if (!supabasePublishableKey) {
  throw new Error('Missing required env var: SUPABASE_PUBLISHABLE_KEY');
}

const nextConfig: NextConfig = {
  // Monorepo root — required so Turbopack resolves workspace packages
  // and the root pnpm-lock.yaml (see Next.js turbopack.root docs).
  turbopack: {
    root: path.join(__dirname, '../..'),
  },
  // Expose only the configured Supabase public settings (no alternate names).
  // Do NOT put SUPABASE_SECRET_KEY here.
  env: {
    SUPABASE_URL: supabaseUrl,
    SUPABASE_PUBLISHABLE_KEY: supabasePublishableKey,
  },
  transpilePackages: [
    '@mcp-saas-starter/audit',
    '@mcp-saas-starter/auth',
    '@mcp-saas-starter/authorization',
    '@mcp-saas-starter/database',
    '@mcp-saas-starter/domain',
    '@mcp-saas-starter/rate-limit',
    '@mcp-saas-starter/shared',
  ],
};

export default nextConfig;
