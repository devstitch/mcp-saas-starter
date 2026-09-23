'use client';

import { useActionState } from 'react';
import { oauthDecisionAction, type OAuthDecisionState } from './actions';

const initialState: OAuthDecisionState = { error: null };

export function ConsentForm({ authorizationId }: { authorizationId: string }) {
  const [state, formAction, pending] = useActionState(oauthDecisionAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="authorization_id" value={authorizationId} />

      {state.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex gap-3">
        <button
          type="submit"
          name="decision"
          value="deny"
          disabled={pending}
          className="rounded border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 disabled:opacity-60"
        >
          Deny
        </button>
        <button
          type="submit"
          name="decision"
          value="approve"
          disabled={pending}
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? 'Working…' : 'Approve'}
        </button>
      </div>
    </form>
  );
}
