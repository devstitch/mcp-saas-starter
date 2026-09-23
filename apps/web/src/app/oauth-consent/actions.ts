'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type OAuthDecisionState = {
  error: string | null;
};

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function loginPathFor(authorizationId: string): string {
  const next = `/oauth-consent?authorization_id=${encodeURIComponent(authorizationId)}`;
  return `/login?next=${encodeURIComponent(next)}`;
}

export async function oauthDecisionAction(
  _prev: OAuthDecisionState,
  formData: FormData,
): Promise<OAuthDecisionState> {
  const authorizationId = String(formData.get('authorization_id') ?? '').trim();
  const decision = String(formData.get('decision') ?? '');

  if (!authorizationId) {
    return { error: 'Missing authorization request.' };
  }
  if (decision !== 'approve' && decision !== 'deny') {
    return { error: 'Choose approve or deny.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(loginPathFor(authorizationId));
  }

  const result =
    decision === 'approve'
      ? await supabase.auth.oauth.approveAuthorization(authorizationId, {
          skipBrowserRedirect: true,
        })
      : await supabase.auth.oauth.denyAuthorization(authorizationId, {
          skipBrowserRedirect: true,
        });

  if (result.error || !result.data?.redirect_url) {
    return {
      error: result.error?.message ?? 'Could not complete the authorization decision.',
    };
  }

  if (!isHttpUrl(result.data.redirect_url)) {
    return { error: 'The authorization server returned an invalid redirect URL.' };
  }

  redirect(result.data.redirect_url);
}
