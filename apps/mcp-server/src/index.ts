import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { loadSupabaseOAuthMetadata } from './auth/oauth-metadata.js';
import {
  requireHost,
  requireMcpServerUrl,
  requirePort,
  requireSupabasePublishableKey,
  requireSupabaseUrl,
} from './env.js';
import { createApp } from './server/create-server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

loadDotenv({ path: path.join(repoRoot, '.env.local') });
loadDotenv({ path: path.join(repoRoot, '.env') });

const port = requirePort();
const host = requireHost();
const mcpServerUrl = requireMcpServerUrl();
const supabaseUrl = requireSupabaseUrl();
const supabasePublishableKey = requireSupabasePublishableKey();

const oauthMetadata = await loadSupabaseOAuthMetadata(supabaseUrl);

const app = createApp({
  supabaseUrl,
  supabasePublishableKey,
  mcpServerUrl,
  oauthMetadata,
});

const server = app.listen(port, host, () => {
  console.log(`MCP server listening on http://${host}:${port}`);
  console.log(`MCP endpoint: ${mcpServerUrl.replace(/\/$/, '')}/mcp`);
  console.log(`Health: http://${host}:${port}/health`);
});

function shutdown(signal: string) {
  console.log(`Received ${signal}, shutting down…`);
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
