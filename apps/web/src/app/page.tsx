import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      {/* Background gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-[#6366f1]/10 blur-[120px]" />
        <div className="absolute -bottom-32 right-1/4 h-96 w-96 rounded-full bg-[#a855f7]/10 blur-[120px]" />
      </div>

      <main className="fade-in relative z-10 flex max-w-xl flex-col items-center gap-6 text-center">
        {/* Logo mark */}
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-muted">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" className="text-accent" />
            <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent opacity-60" />
            <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent opacity-80" />
          </svg>
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          DevStitch
        </p>

        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          <span className="gradient-text">MCP SaaS Starter</span>
        </h1>

        <p className="max-w-md text-base leading-relaxed text-muted-foreground">
          Add a secure MCP interface to your existing SaaS. Authenticate agents via OAuth, enforce per-tenant permissions, and audit every action.
        </p>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Link href="/login" className="btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            Sign in
          </Link>
          <Link href="/dashboard" className="btn-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            Dashboard
          </Link>
        </div>

        {/* Feature pills */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {['OAuth 2.1', 'RBAC', 'Audit Logs', 'Multi-Tenant', 'Rate Limiting'].map((feature) => (
            <span key={feature} className="badge badge-muted">
              {feature}
            </span>
          ))}
        </div>
      </main>
    </div>
  );
}
