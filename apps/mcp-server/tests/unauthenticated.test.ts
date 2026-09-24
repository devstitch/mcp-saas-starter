import type { AddressInfo } from 'node:net';
import type { OAuthMetadata } from '@modelcontextprotocol/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/server/create-server.js';

const oauthMetadata = {
  issuer: 'https://example.supabase.co/auth/v1',
  authorization_endpoint: 'https://example.supabase.co/auth/v1/oauth/authorize',
  token_endpoint: 'https://example.supabase.co/auth/v1/oauth/token',
  response_types_supported: ['code'],
  grant_types_supported: ['authorization_code', 'refresh_token'],
  code_challenge_methods_supported: ['S256'],
} as OAuthMetadata;

describe('unauthenticated MCP request', () => {
  const app = createApp({
    supabaseUrl: 'https://example.supabase.co',
    supabasePublishableKey: 'publishable-test-key',
    mcpServerUrl: 'http://127.0.0.1:3001',
    oauthMetadata,
  });
  let baseUrl = '';
  let close: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server.once('listening', () => resolve()));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
    close = () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
  });

  afterAll(async () => {
    await close?.();
  });

  it('unauthenticated request is rejected', async () => {
    const response = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {},
      }),
    });

    expect(response.status).toBe(401);
    const body = (await response.json()) as { error?: string };
    expect(body.error).toBeTruthy();
  });
});
