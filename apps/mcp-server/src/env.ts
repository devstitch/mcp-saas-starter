function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function requirePort(): number {
  const raw = required('PORT');
  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid PORT: ${raw}`);
  }
  return port;
}

export function requireHost(): string {
  return required('HOST');
}

export function requireMcpServerUrl(): string {
  return required('MCP_SERVER_URL');
}

export function requireSupabaseUrl(): string {
  return required('SUPABASE_URL');
}

export function requireSupabasePublishableKey(): string {
  return required('SUPABASE_PUBLISHABLE_KEY');
}

export function requireSupabaseSecretKey(): string {
  return required('SUPABASE_SECRET_KEY');
}

/** Public MCP endpoint. MCP_SERVER_URL is the origin; /mcp is appended when missing. */
export function mcpEndpointUrl(mcpServerUrl: string): URL {
  const base = mcpServerUrl.replace(/\/$/, '');
  const endpoint = base.endsWith('/mcp') ? base : `${base}/mcp`;
  return new URL(endpoint);
}

const LOCAL_HOSTNAMES = ['localhost', '127.0.0.1', '[::1]'] as const;

/**
 * Hostnames the MCP server will accept in Host and Origin headers.
 * Localhost stays allowed. A tunnel or public origin in MCP_SERVER_URL is added
 * so ChatGPT can reach the server without a DNS-rebinding 403.
 */
export function allowedServerHostnames(mcpServerUrl: string): string[] {
  const hostname = new URL(mcpServerUrl).hostname;
  const publicHost = hostname.includes(':') ? `[${hostname}]` : hostname;
  if (LOCAL_HOSTNAMES.includes(publicHost as (typeof LOCAL_HOSTNAMES)[number])) {
    return [...LOCAL_HOSTNAMES];
  }
  return [...LOCAL_HOSTNAMES, publicHost];
}
