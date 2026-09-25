'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOutAction } from '@/app/login/actions';

export interface DashboardSidebarProps {
  userEmail: string;
  organizationName?: string;
  role?: string;
  pendingApprovalsCount?: number;
}

export function DashboardSidebar({
  userEmail,
  organizationName = 'Default Workspace',
  role = 'viewer',
  pendingApprovalsCount = 0,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    {
      label: 'Workspace',
      items: [
        {
          href: '/dashboard',
          label: 'Overview',
          badge: null,
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          ),
        },
        {
          href: '/dashboard/projects',
          label: 'Projects & Tasks',
          badge: null,
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              <line x1="12" y1="11" x2="12" y2="17" />
              <line x1="9" y1="14" x2="15" y2="14" />
            </svg>
          ),
        },
      ],
    },
    {
      label: 'Agent & Governance',
      items: [
        {
          href: '/dashboard/agent-activity',
          label: 'Agent Activity',
          badge: 'Live',
          badgeClass: 'bg-info-muted text-info',
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          ),
        },
        {
          href: '/dashboard/approvals',
          label: 'Pending Actions',
          badge: pendingApprovalsCount > 0 ? `${pendingApprovalsCount}` : null,
          badgeClass: 'bg-danger text-white pulse-subtle',
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
              <path d="M12 6v6l4 2" />
            </svg>
          ),
        },
      ],
    },
  ];

  function roleBadgeClass(r: string) {
    switch (r) {
      case 'admin':
        return 'badge-accent';
      case 'member':
        return 'badge-info';
      default:
        return 'badge-muted';
    }
  }

  // Get user initial
  const userInitial = userEmail ? userEmail.charAt(0).toUpperCase() : 'U';

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between">
      <div className="space-y-6">
        {/* Brand & Workspace Switcher Header */}
        <div className="px-2 pt-1">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7l10 5 10-5-10-5z" fill="white" />
                <path d="M2 17l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60" />
                <path d="M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight text-foreground">MCP Studio</p>
              <div className="flex items-center gap-1.5">
                <span className="glow-dot bg-success" />
                <span className="text-[0.6875rem] font-medium text-muted-foreground">SaaS Starter</span>
              </div>
            </div>
          </Link>

          {/* Org context pill */}
          <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-surface-elevated/70 px-3 py-2">
            <div className="min-w-0 pr-2">
              <p className="text-[0.6875rem] uppercase tracking-wider text-muted">Organization</p>
              <p className="truncate text-xs font-semibold text-foreground">{organizationName}</p>
            </div>
            <span className={`badge ${roleBadgeClass(role)} shrink-0 text-[0.625rem]`}>{role}</span>
          </div>
        </div>

        {/* Navigation Groups */}
        <nav className="space-y-6 px-1">
          {navItems.map((group) => (
            <div key={group.label} className="space-y-1">
              <p className="px-3 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted">
                {group.label}
              </p>
              <div className="space-y-0.5 pt-1">
                {group.items.map((item) => {
                  const isActive =
                    item.href === '/dashboard'
                      ? pathname === '/dashboard'
                      : pathname?.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`nav-link ${isActive ? 'nav-link-active' : ''}`}
                    >
                      <span className={isActive ? 'text-accent' : 'text-muted-foreground'}>
                        {item.icon}
                      </span>
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge && (
                        <span
                          className={`badge-counter ${
                            item.badgeClass || 'bg-surface-elevated text-muted-foreground'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* System & MCP Architecture pill */}
          <div className="rounded-xl border border-border/80 bg-surface/60 p-3 text-xs">
            <div className="flex items-center justify-between pb-1">
              <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted">MCP Protocol</span>
              <span className="inline-flex items-center gap-1 rounded bg-success-muted px-1.5 py-0.5 text-[0.625rem] font-medium text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                Active
              </span>
            </div>
            <p className="mt-1 text-[0.6875rem] text-muted-foreground leading-relaxed">
              Serving Claude Desktop & Cursor with multi-tenant auth and audit trails.
            </p>
          </div>
        </nav>
      </div>

      {/* User profile footer */}
      <div className="border-t border-border pt-4">
        <div className="flex items-center justify-between gap-3 px-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/20 font-bold text-accent text-xs">
              {userInitial}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-foreground">{userEmail}</p>
              <p className="text-[0.65rem] text-muted capitalize">{role} Member</p>
            </div>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-danger"
              title="Sign out"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Header */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-md md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs">
            M
          </div>
          <span className="text-sm font-semibold">MCP Studio</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-foreground"
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </header>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-surface p-4 shadow-2xl transition-transform duration-200 ease-in-out md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop Sticky Sidebar */}
      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-surface/40 p-4 backdrop-blur-xl md:sticky md:top-0 md:flex">
        {sidebarContent}
      </aside>
    </>
  );
}
