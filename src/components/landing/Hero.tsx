"use client";

import Image from "next/image";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

gsap.registerPlugin(useGSAP);

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (reduced) {
        gsap.set("[data-hero-anim]", {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
        });
        return;
      }

      gsap.set("[data-hero-anim]", {
        opacity: 0,
        y: 28,
        filter: "blur(8px)",
      });
      gsap.set("[data-hero-image]", {
        opacity: 0,
        scale: 0.92,
        filter: "blur(12px)",
      });

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.to("[data-hero-image]", {
        opacity: 1,
        scale: 1,
        filter: "blur(0px)",
        duration: 1.4,
        ease: "expo.out",
      })
        .to(
          "[data-hero-anim]",
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 1.1,
            stagger: 0.09,
          },
          "-=1.1"
        )
        .from(
          "[data-hero-corner]",
          {
            opacity: 0,
            scale: 0.6,
            duration: 0.7,
            stagger: 0.12,
            ease: "back.out(2)",
          },
          "-=0.5"
        );
    },
    { scope: ref }
  );

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex items-center px-6 sm:px-10 pt-28 pb-20"
    >
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-12 lg:gap-16 items-center">
        <div className="md:col-span-7 text-left">
          <div className="landing-chip mb-7" data-hero-anim>
            <Sparkles className="w-3 h-3" strokeWidth={1.5} />
            <span>Wedding biodata · Web app · India</span>
          </div>

          <h1
            data-hero-anim
            className="landing-display text-[40px] sm:text-[56px] md:text-[68px] lg:text-[84px] leading-[0.92] mb-6 origin-left break-words sm:whitespace-nowrap"
            style={{
              color: "var(--landing-accent)",
              letterSpacing: "-0.045em",
              transform: "scaleY(0.94)",
            }}
          >
            Nakshatra
          </h1>

          <h2
            data-hero-anim
            className="text-[26px] sm:text-[36px] md:text-[44px] lg:text-[52px] leading-[1.08] mb-7 max-w-[18ch] text-[color:var(--landing-text)]"
            style={{
              fontFamily: "var(--font-harmond)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            A wedding biodata{" "}
            <span className="text-[color:var(--landing-accent)] italic">
              that designs itself.
            </span>
          </h2>

          <p
            data-hero-anim
            className="text-[15px] sm:text-[17px] text-[color:var(--landing-text-dim)] max-w-[52ch] mb-10 leading-[1.65]"
            style={{ fontFamily: "var(--font-ranade)", fontWeight: 400 }}
          >
            Build it once. Share it forever. We turn your rashi into the
            colours, the typography, the constellation behind your name. No
            other biodata tool reads your stars.
          </p>

          <div
            data-hero-anim
            className="flex flex-wrap items-center gap-5 sm:gap-7 mb-8"
          >
            <Link href="/signup" className="landing-btn-primary" data-hero-cta>
              Create my biodata
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
            </Link>
            <a href="#sample" className="landing-btn-ghost">
              See a sample
            </a>
          </div>

          <div
            data-hero-anim
            className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] tracking-[0.28em] uppercase text-[color:var(--landing-text-muted)]"
          >
            <span>Free during launch</span>
            <span className="w-1 h-1 rounded-full bg-[color:var(--landing-accent)]" />
            <span>Rashi-rooted design</span>
            <span className="w-1 h-1 rounded-full bg-[color:var(--landing-accent)]" />
            <span>WhatsApp-native</span>
          </div>
        </div>

        <div className="md:col-span-5 relative group" data-hero-image>
          <div className="landing-glass rounded-xl p-3 sm:p-4 relative overflow-hidden">
            <div className="relative aspect-[2/3] rounded-lg overflow-hidden">
              <Image
                src="/pictures/constellations.jpg"
                alt="Zodiac wheel — twelve rashis arranged around the cosmos"
                fill
                priority
                sizes="(max-width: 768px) 100vw, 40vw"
                className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
              />
            </div>
          </div>
          <div
            data-hero-corner
            className="absolute -bottom-4 -right-4 w-24 h-24 border-r-2 border-b-2 border-[color:var(--landing-accent)]/40 rounded-br-xl pointer-events-none"
          />
          <div
            data-hero-corner
            className="absolute -top-4 -left-4 w-24 h-24 border-l-2 border-t-2 border-[color:var(--landing-accent)]/40 rounded-tl-xl pointer-events-none"
          />
        </div>
      </div>
    </section>
  );
}
