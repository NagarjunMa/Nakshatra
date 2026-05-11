import Image from "next/image";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center px-6 sm:px-10 pt-28 pb-20">
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-12 lg:gap-16 items-center landing-fade-up">
        <div className="md:col-span-7 text-left">
          <div className="landing-chip mb-7">
            <Sparkles className="w-3 h-3" strokeWidth={1.5} />
            <span>Wedding biodata · Web app · India</span>
          </div>

          <h1
            className="landing-display text-[44px] sm:text-[56px] md:text-[68px] lg:text-[84px] leading-[0.92] mb-6 origin-left whitespace-nowrap"
            style={{
              color: "var(--landing-accent)",
              letterSpacing: "-0.045em",
              transform: "scaleY(0.94)",
            }}
          >
            Nakshatra
          </h1>

          <h2
            className="text-[28px] sm:text-[36px] md:text-[44px] lg:text-[52px] leading-[1.08] mb-7 max-w-[18ch] text-[color:var(--landing-text)]"
            style={{
              fontFamily: "var(--font-harmond)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            Your wedding biodata,{" "}
            <span className="text-[color:var(--landing-accent)] italic">
              on one link forever.
            </span>
          </h2>

          <p
            className="text-[15px] sm:text-[17px] text-[color:var(--landing-text-dim)] max-w-[48ch] mb-10 leading-[1.65]"
            style={{ fontFamily: "var(--font-mango)", fontWeight: 400 }}
          >
            Fill a form on your phone in ten minutes. Get a shareable link.
            Edit anytime — your updates appear instantly for everyone who has
            it. No more PDFs in WhatsApp groups.
          </p>

          <div className="flex flex-wrap items-center gap-5 sm:gap-7 mb-8">
            <Link href="/signup" className="landing-btn-primary">
              Create my biodata
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
            </Link>
            <a href="#sample" className="landing-btn-ghost">
              See a sample
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] tracking-[0.28em] uppercase text-[color:var(--landing-text-muted)]">
            <span>Free during launch</span>
            <span className="w-1 h-1 rounded-full bg-[color:var(--landing-accent)]" />
            <span>Rashi-rooted design</span>
            <span className="w-1 h-1 rounded-full bg-[color:var(--landing-accent)]" />
            <span>WhatsApp-native</span>
          </div>
        </div>

        <div className="md:col-span-5 relative group">
          <div className="landing-glass rounded-xl p-4 sm:p-5 md:p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-[color:var(--landing-accent)]/[0.04] mix-blend-overlay pointer-events-none" />
            <div className="relative aspect-square rounded-lg overflow-hidden">
              <Image
                src="/pictures/constellations.jpg"
                alt="Celestial chart — constellations representing the twelve rashis"
                fill
                priority
                sizes="(max-width: 768px) 100vw, 40vw"
                className="object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-700"
                style={{
                  filter: "drop-shadow(0 0 24px rgba(134, 118, 196, 0.35))",
                }}
              />
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 border-r-2 border-b-2 border-[color:var(--landing-accent)]/40 rounded-br-xl pointer-events-none" />
          <div className="absolute -top-4 -left-4 w-24 h-24 border-l-2 border-t-2 border-[color:var(--landing-accent)]/40 rounded-tl-xl pointer-events-none" />
        </div>
      </div>
    </section>
  );
}
