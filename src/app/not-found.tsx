import Link from "next/link";

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="flex flex-1 flex-col items-center justify-center bg-[color:var(--workspace-canvas)] px-4 py-16 text-center text-[color:var(--workspace-ink)]"
    >
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mt-2 text-base text-[color:var(--workspace-ink-muted)]">
        We could not find that page.
      </p>
      <Link
        href="/dashboard"
        className="workspace-focus mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-[color:var(--workspace-navy)] px-5 text-base font-semibold text-white transition-colors hover:bg-[color:var(--workspace-navy-strong)]"
      >
        Go to dashboard
      </Link>
    </main>
  );
}
