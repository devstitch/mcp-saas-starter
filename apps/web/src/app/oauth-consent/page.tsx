import { redirect } from 'next/navigation';
import { pickPrimaryMembership, resolveUserMemberships } from '@mcp-saas-starter/auth';
import { createClient } from '@/lib/supabase/server';
import { ConsentForm } from './consent-form';

const SCOPE_LABELS: Record<string, string> = {
  openid: 'Sign in as you',
  email: 'See your email address',
  profile: 'See your profile',
  phone: 'See your phone number',
};

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function ConsentMessage({ title, body }: { title: string; body: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-3 p-8">
      <p className="text-sm text-neutral-500">DevStitch</p>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-neutral-600">{body}</p>
    </main>
  );
}

export default async function OAuthConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ authorization_id?: string }>;
}) {
  const params = await searchParams;
  const authorizationId = params.authorization_id?.trim();

  if (!authorizationId) {
    return (
      <ConsentMessage
        title="Missing authorization request"
        body="Start sign-in from an MCP client. Supabase redirects here with an authorization_id."
      />
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = `/oauth-consent?authorization_id=${encodeURIComponent(authorizationId)}`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const { data: authDetails, error } =
    await supabase.auth.oauth.getAuthorizationDetails(authorizationId);

  if (error || !authDetails) {
    return (
      <ConsentMessage
        title="Could not load this request"
        body={error?.message ?? 'Invalid authorization request.'}
      />
    );
  }

  if (!('authorization_id' in authDetails)) {
    if (!isHttpUrl(authDetails.redirect_url)) {
      return (
        <ConsentMessage
          title="Invalid redirect"
          body="This authorization was already decided, but the redirect URL was not a valid http(s) address."
        />
      );
    }
    redirect(authDetails.redirect_url);
  }

  const memberships = await resolveUserMemberships(supabase, user.id);
  const primary = pickPrimaryMembership(memberships);
  const scopes = authDetails.scope.split(/\s+/).filter(Boolean);
  const email = authDetails.user.email || user.email || 'Signed-in user';

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 p-8">
      <div>
        <p className="text-sm text-neutral-500">DevStitch</p>
        <h1 className="text-2xl font-semibold">Authorize {authDetails.client.name}</h1>
        <p className="mt-1 text-sm text-neutral-600">
          This MCP client wants to act in your SaaS account. Approving lets it call tools as you.
        </p>
      </div>

      <dl className="space-y-3 rounded border border-neutral-200 p-4 text-sm">
        <div>
          <dt className="font-medium text-neutral-700">Client</dt>
          <dd>{authDetails.client.name}</dd>
        </div>
        <div>
          <dt className="font-medium text-neutral-700">Signed in as</dt>
          <dd>{email}</dd>
          <dd className="text-neutral-500">
            {primary
              ? `${primary.organizationName} · ${primary.role}`
              : 'No organization membership'}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-neutral-700">Returns to</dt>
          <dd className="break-all text-neutral-600">{authDetails.redirect_uri}</dd>
        </div>
        <div>
          <dt className="font-medium text-neutral-700">Requested access</dt>
          {scopes.length === 0 ? (
            <dd className="text-neutral-600">No specific scopes were requested.</dd>
          ) : (
            <dd>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {scopes.map((scope) => (
                  <li key={scope}>
                    {SCOPE_LABELS[scope] ?? scope}
                    {SCOPE_LABELS[scope] ? (
                      <span className="text-neutral-500"> ({scope})</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </dd>
          )}
        </div>
      </dl>

      <ConsentForm authorizationId={authDetails.authorization_id} />
    </main>
  );
}
