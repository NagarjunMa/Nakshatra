import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "./Reveal";

export function FinalCTA() {
  return (
    <section className="relative py-28 sm:py-36 md:py-40 px-6 sm:px-10 overflow-hidden">
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[480px] bg-[color:var(--landing-accent)]/15 blur-[140px] rounded-full pointer-events-none" />

      <Reveal stagger={0.12}>
        <div className="relative max-w-3xl mx-auto text-center">
          <p className="landing-section-title mb-6 reveal">Begin</p>

          <h2
            className="reveal text-[36px] sm:text-[64px] md:text-[88px] lg:text-[96px] text-[color:var(--landing-text)] leading-[0.95] mb-8"
            style={{
              fontFamily: "var(--font-hkgrotesk)",
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
            className="reveal text-[16px] sm:text-[20px] md:text-[22px] text-[color:var(--landing-text)] max-w-xl mx-auto mb-10 sm:mb-12 leading-[1.4]"
            style={{ fontFamily: "var(--font-ranade)", fontWeight: 300 }}
          >
            Ten minutes to build. Free during launch. Forever yours.
          </p>

          <div className="reveal flex flex-col items-center gap-4">
            <Link
              href="/signup"
              className="landing-btn-primary text-[13px] sm:text-[14px] px-7 sm:px-9 py-3.5 sm:py-4"
            >
              Create my biodata
              <ArrowRight className="w-4 h-4" strokeWidth={2} />
            </Link>
            <p
              className="text-[11px] sm:text-[12px] tracking-[0.22em] uppercase text-[color:var(--landing-text-dim)] text-center"
              style={{ fontFamily: "var(--font-ranade)" }}
            >
              Sign in with Google or email · No credit card
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
