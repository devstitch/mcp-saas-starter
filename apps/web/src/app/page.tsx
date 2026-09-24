import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 p-8">
      <p className="text-sm text-neutral-500">DevStitch</p>
      <h1 className="text-3xl font-semibold">MCP SaaS Starter</h1>
      <p className="text-neutral-600">Add a secure MCP interface to your existing SaaS.</p>
      <nav className="flex flex-wrap gap-3 text-sm">
        <Link className="underline" href="/login">
          Login
        </Link>
        <Link className="underline" href="/dashboard">
          Dashboard
        </Link>
      </nav>
    </main>
  );
}
