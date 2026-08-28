"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("App error:", error.message);

  return (
    <main
      id="main-content"
      className="flex flex-1 flex-col items-center justify-center bg-[color:var(--workspace-canvas)] px-4 py-16 text-center text-[color:var(--workspace-ink)]"
    >
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 max-w-md text-base text-[color:var(--workspace-ink-muted)]">
        We could not finish that action. Your saved information is unchanged.
        Please try again.
      </p>
      <div className="mt-6 flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          onClick={reset}
          className="workspace-focus inline-flex min-h-12 items-center justify-center rounded-xl bg-[color:var(--workspace-navy)] px-5 text-base font-semibold text-white transition-colors hover:bg-[color:var(--workspace-navy-strong)]"
        >
          Try again
        </button>
        <Link
          href="/"
          className="workspace-focus inline-flex min-h-12 items-center justify-center rounded-xl border border-[color:var(--workspace-border)] bg-white px-5 text-base font-semibold transition-colors hover:bg-[color:var(--workspace-surface-soft)]"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
