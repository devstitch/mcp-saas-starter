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
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-8">
      <div>
        <p className="text-sm text-neutral-500">DevStitch</p>
        <h1 className="text-2xl font-semibold">MCP SaaS Starter</h1>
        <p className="mt-1 text-sm text-neutral-600">Sign in with your SaaS account.</p>
      </div>

      <LoginForm nextPath={nextPath} />

      <p className="text-xs text-neutral-500">
        Demo: <code>admin@acme.example.com</code> / <code>Password123!</code>
        {' · '}
        <Link href="/" className="underline">
          Home
        </Link>
      </p>
    </main>
  );
}
