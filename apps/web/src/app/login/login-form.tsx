'use client';

import { useActionState } from 'react';
import { loginAction, type LoginState } from './actions';

const initialState: LoginState = { error: null };

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <input type="hidden" name="next" value={nextPath} />

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue="admin@acme.example.com"
          className="rounded border border-neutral-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Password</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded border border-neutral-300 px-3 py-2"
        />
      </label>

      {state.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
