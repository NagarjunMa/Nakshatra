import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function FinalCTA() {
  return (
    <section className="relative py-32 sm:py-40 px-6 sm:px-10 overflow-hidden">
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[480px] bg-[color:var(--landing-accent)]/15 blur-[140px] rounded-full pointer-events-none" />

      <div className="relative max-w-3xl mx-auto text-center">
        <p className="landing-section-title mb-6">Begin</p>

        <h2
          className="text-[44px] sm:text-[72px] md:text-[96px] text-[color:var(--landing-text)] leading-[0.95] mb-8"
          style={{
            fontFamily: "var(--font-harmond)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
          }}
        >
          Your biodata,
          <br />
          <span className="text-[color:var(--landing-accent)] italic">
            on one link.
          </span>
        </h2>

        <p
          className="text-[18px] sm:text-[22px] text-[color:var(--landing-text)] max-w-xl mx-auto mb-12 leading-[1.4]"
          style={{ fontFamily: "var(--font-mango)", fontWeight: 300 }}
        >
          Ten minutes to build. Free during launch. Forever yours.
        </p>

        <div className="flex flex-col items-center gap-4">
          <Link
            href="/signup"
            className="landing-btn-primary text-[14px] px-9 py-4"
          >
            Create my biodata
            <ArrowRight className="w-4 h-4" strokeWidth={2} />
          </Link>
          <p
            className="text-[12px] tracking-[0.22em] uppercase text-[color:var(--landing-text-dim)]"
            style={{ fontFamily: "var(--font-mango)" }}
          >
            Sign in with Google or email · No credit card
          </p>
        </div>
      </div>
    </section>
  );
}
