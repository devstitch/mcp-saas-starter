'use client';

import { useActionState } from 'react';
import { loginAction, type LoginState } from './actions';

const initialState: LoginState = { error: null };

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      <input type="hidden" name="next" value={nextPath} />

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Email
        </span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue="admin@acme.example.com"
          placeholder="you@company.com"
          className="input"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Password
        </span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="input"
        />
      </label>

      {state.error ? (
        <div className="alert alert-danger" role="alert">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          {state.error}
        </div>
      ) : null}

      <button type="submit" disabled={pending} className="btn-primary mt-1 py-2.5">
        {pending ? (
          <>
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
            Signing in…
          </>
        ) : (
          'Sign in'
        )}
      </button>
    </form>
  );
}
