import Link from 'next/link';
import { safeInternalPath } from '@/lib/auth/safe-next';
import { LoginForm } from './login-form';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const nextPath = safeInternalPath(params.next);

  return (
    <div className="relative flex min-h-screen items-center justify-center px-6">
      {/* Background gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/3 h-80 w-80 rounded-full bg-[#6366f1]/8 blur-[100px]" />
        <div className="absolute -bottom-32 right-1/3 h-80 w-80 rounded-full bg-[#a855f7]/8 blur-[100px]" />
      </div>

      <main className="fade-in relative z-10 w-full max-w-[400px]">
        <div className="glass-card p-8">
          {/* Header */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-muted">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" className="text-accent" />
                <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent opacity-60" />
                <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent opacity-80" />
              </svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight">Welcome back</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to your account</p>
          </div>

          <LoginForm nextPath={nextPath} />

          {/* Demo credentials */}
          <div className="mt-6 rounded-lg bg-surface-elevated p-3">
            <p className="mb-1.5 text-[0.6875rem] font-semibold uppercase tracking-widest text-muted">
              Demo Credentials
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              admin@acme.example.com
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              Password123!
            </p>
          </div>
        </div>

        {/* Back to home */}
        <p className="mt-4 text-center text-xs text-muted">
          <Link href="/" className="text-muted-foreground transition-colors hover:text-foreground">
            ← Back to home
          </Link>
        </p>
      </main>
    </div>
  );
}
