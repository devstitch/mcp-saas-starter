import type { OAuthMetadata } from '@modelcontextprotocol/server';

/**
 * Endpoints Supabase Auth serves once the OAuth 2.1 server is enabled.
 * Used only when the live discovery document is not published yet.
 */
function documentedSupabaseOAuthMetadata(supabaseUrl: string): OAuthMetadata {
  const issuer = new URL('/auth/v1', supabaseUrl.endsWith('/') ? supabaseUrl : `${supabaseUrl}/`)
    .href.replace(/\/$/, '');

  return {
    issuer,
    authorization_endpoint: `${issuer}/oauth/authorize`,
    token_endpoint: `${issuer}/oauth/token`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_basic', 'client_secret_post'],
    scopes_supported: ['openid', 'email', 'profile'],
  };
}

function isOAuthMetadata(value: unknown): value is OAuthMetadata {
  if (!value || typeof value !== 'object') return false;
  const body = value as Record<string, unknown>;
  return (
    typeof body.issuer === 'string' &&
    typeof body.authorization_endpoint === 'string' &&
    typeof body.token_endpoint === 'string' &&
    Array.isArray(body.response_types_supported)
  );
}

/**
 * Load the Authorization Server metadata Supabase publishes.
 * The MCP server is only a resource server — it does not implement OAuth itself.
 * If the OAuth server is not enabled yet, discovery 404s; we still advertise the
 * documented Supabase endpoints so the process can start.
 */
export async function loadSupabaseOAuthMetadata(supabaseUrl: string): Promise<OAuthMetadata> {
  const discoveryUrl = new URL(
    '/.well-known/oauth-authorization-server/auth/v1',
    supabaseUrl.endsWith('/') ? supabaseUrl : `${supabaseUrl}/`,
  );

  let response: Response;
  try {
    response = await fetch(discoveryUrl);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'network error';
    throw new Error(
      `Could not reach Supabase OAuth discovery at ${discoveryUrl.href} (${reason}).`,
    );
  }

  if (response.status === 404) {
    console.warn(
      `Supabase OAuth discovery returned 404 at ${discoveryUrl.href}. ` +
        'Enable the OAuth 2.1 server (Authentication → OAuth Server), set Site URL to the web app, ' +
        'and set Authorization Path to /oauth-consent. Restart the MCP server after that so clients ' +
        'receive the live discovery document. Using the documented Supabase Auth endpoints until then.',
    );
    return documentedSupabaseOAuthMetadata(supabaseUrl);
  }

  if (!response.ok) {
    throw new Error(
      `Supabase OAuth discovery at ${discoveryUrl.href} returned ${response.status}.`,
    );
  }

  const body: unknown = await response.json();
  if (!isOAuthMetadata(body)) {
    throw new Error(`Supabase OAuth metadata from ${discoveryUrl.href} is missing required fields.`);
  }

  return body;
}
