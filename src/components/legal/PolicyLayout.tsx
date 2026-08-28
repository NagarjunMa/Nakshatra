import Link from "next/link";
import type { ReactNode } from "react";

export function PolicyLayout({
  eyebrow,
  title,
  summary,
  children,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[color:var(--workspace-canvas)] text-[color:var(--workspace-ink)]">
      <header className="border-b border-[color:var(--workspace-border)] bg-[#fffdf8]/95 px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <Link href="/" className="workspace-focus inline-flex min-h-12 items-center rounded-lg px-2 text-base font-extrabold tracking-[0.12em] text-[color:var(--workspace-navy)]">
            NAKSHATRA
          </Link>
          <Link href="/signup" className="workspace-focus inline-flex min-h-12 items-center rounded-lg bg-[color:var(--workspace-navy)] px-4 text-sm font-semibold text-white">
            Get started
          </Link>
        </div>
      </header>
      <main id="main-content" className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="text-sm font-semibold text-[color:var(--workspace-teal)]">{eyebrow}</p>
        <h1 className="mt-3 max-w-3xl font-[family-name:var(--font-portfolio-display)] text-4xl font-medium leading-tight sm:text-5xl">{title}</h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-[color:var(--workspace-ink-muted)] sm:text-lg">{summary}</p>
        <div className="policy-content mt-10 space-y-8">{children}</div>
      </main>
    </div>
  );
}

export function PolicySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[color:var(--workspace-border)] bg-[color:var(--workspace-surface)] p-5 sm:p-7">
      <h2 className="text-xl font-semibold text-[color:var(--workspace-ink)]">{title}</h2>
      <div className="mt-3 space-y-3 text-base leading-7 text-[color:var(--workspace-ink-muted)]">{children}</div>
    </section>
  );
}
