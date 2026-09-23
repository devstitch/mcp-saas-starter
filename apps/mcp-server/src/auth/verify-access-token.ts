import { createSupabaseClient } from '@mcp-saas-starter/database';
import {
  OAuthError,
  OAuthErrorCode,
  type AuthInfo,
  type OAuthTokenVerifier,
} from '@modelcontextprotocol/server';

/**
 * Verify a Supabase-issued access token with the Auth server's JWKS
 * (`auth.getClaims`). Does not decode the JWT by hand.
 */
export function createSupabaseTokenVerifier(env: {
  supabaseUrl: string;
  supabasePublishableKey: string;
}): OAuthTokenVerifier {
  const supabase = createSupabaseClient(env.supabaseUrl, env.supabasePublishableKey);

  return {
    async verifyAccessToken(token: string): Promise<AuthInfo> {
      const { data, error } = await supabase.auth.getClaims(token);
      if (error || !data?.claims) {
        console.error('Access token rejected:', error?.message ?? 'no claims');
        throw new OAuthError(OAuthErrorCode.InvalidToken, 'Invalid or expired access token');
      }

      const { claims } = data;
      if (typeof claims.sub !== 'string' || claims.sub.length === 0) {
        throw new OAuthError(OAuthErrorCode.InvalidToken, 'Access token is missing a user id');
      }
      if (typeof claims.exp !== 'number') {
        throw new OAuthError(OAuthErrorCode.InvalidToken, 'Access token is missing exp');
      }

      const clientId = typeof claims.client_id === 'string' ? claims.client_id : '';
      const scopeClaim = claims.scope;
      const scopes = Array.isArray(scopeClaim)
        ? scopeClaim.filter((scope): scope is string => typeof scope === 'string')
        : typeof scopeClaim === 'string'
          ? scopeClaim.split(/\s+/).filter(Boolean)
          : [];

      return {
        token,
        clientId,
        scopes,
        expiresAt: claims.exp,
        extra: {
          userId: claims.sub,
          clientId: clientId || null,
        },
      };
    },
  };
}
