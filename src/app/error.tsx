"use client";

import Link from "next/link";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="text-xl font-semibold text-ink">Ceva n-a mers bine</h1>
      <p className="mt-1 text-sm text-muted">Something went wrong</p>
      <p className="mt-4 text-sm text-body">Am notat problema. Încearcă din nou. / We logged the problem. Please try again.</p>
      <div className="mt-6 flex gap-3">
        <button onClick={reset} className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-canvas">
          Reîncearcă / Retry
        </button>
        <Link href="/" className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink">
          Acasă / Home
        </Link>
      </div>
    </main>
  );
}
