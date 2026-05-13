"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { LogIn, FileEdit, Send, RefreshCw, LucideIcon } from "lucide-react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Step = {
  icon: LucideIcon;
  label: string;
  title: string;
  body: string;
  moat: string;
};

const steps: Step[] = [
  {
    icon: LogIn,
    label: "Sign in",
    title: "One tap to start.",
    body: "Sign in with Google or email. Your biodata draft opens the moment you arrive. Parents can fill it with you, from the same login.",
    moat: "Family-collaborative from minute one",
  },
  {
    icon: FileEdit,
    label: "Fill the form",
    title: "Your details. We handle the design.",
    body: "Nine quick sections. Name, photo, rashi, family, education. You will not pick a font. You will not pick a colour. Your nakshatra becomes the background.",
    moat: "Zero design work — your rashi runs the visuals",
  },
  {
    icon: Send,
    label: "Publish",
    title: "Dressed for your family.",
    body: "Tap publish. Your rashi's palette is applied. Your constellation is drawn behind your name. Editorial typography, set automatically. Ready to share in ten seconds.",
    moat: "Personalisation made visible",
  },
  {
    icon: RefreshCw,
    label: "Send. Edit. Repeat.",
    title: "Update without re-sending.",
    body: 'Forward it once on WhatsApp. Add your promotion next month. Add your MBA next year. Family sees the new version the moment they open it. No "ignore the last PDF" messages.',
    moat: "Escape the PDF re-send loop",
  },
];

export function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      const mm = gsap.matchMedia();

      mm.add(
        "(min-width: 768px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)",
        () => {
          const cards = gsap.utils.toArray<HTMLElement>(".how-card");
          const dots = gsap.utils.toArray<HTMLElement>(".how-dot");
          const progressBar = containerRef.current?.querySelector(
            ".how-progress"
          ) as HTMLElement | null;
          if (!cards.length || !containerRef.current) return;

          containerRef.current.style.height = `${cards.length * 100}vh`;
          cards.forEach((c) => {
            c.style.position = "absolute";
            c.style.inset = "0";
          });

          gsap.set(cards, {
            opacity: 0,
            y: 80,
            scale: 0.94,
            filter: "blur(8px)",
          });
          gsap.set(cards[0], {
            opacity: 1,
            y: 0,
            scale: 1,
            filter: "blur(0px)",
          });
          gsap.set(dots, { backgroundColor: "rgba(228,229,238,0.18)" });
          gsap.set(dots[0], { backgroundColor: "var(--landing-accent)" });

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top top",
              end: `+=${(cards.length - 1) * 100}%`,
              pin: ".how-pin",
              scrub: 0.6,
              invalidateOnRefresh: true,
            },
          });

          if (progressBar) {
            tl.to(
              progressBar,
              { scaleX: 1, ease: "none", duration: cards.length - 1 },
              0
            );
          }

          cards.forEach((card, i) => {
            if (i === 0) return;
            const prev = cards[i - 1];
            const offset = i - 1;

            tl.to(
              prev,
              {
                opacity: 0,
                y: -60,
                scale: 0.92,
                filter: "blur(10px)",
                duration: 0.7,
                ease: "power2.in",
              },
              offset
            )
              .fromTo(
                card,
                {
                  opacity: 0,
                  y: 80,
                  scale: 0.94,
                  filter: "blur(8px)",
                },
                {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  filter: "blur(0px)",
                  duration: 0.8,
                  ease: "power2.out",
                },
                offset + 0.2
              )
              .to(
                dots[i - 1],
                {
                  backgroundColor: "rgba(228,229,238,0.18)",
                  duration: 0.3,
                },
                offset + 0.4
              )
              .to(
                dots[i],
                {
                  backgroundColor: "var(--landing-accent)",
                  duration: 0.3,
                },
                offset + 0.4
              );
          });
        }
      );

      mm.add(
        "(max-width: 767px), (max-height: 699px), (prefers-reduced-motion: reduce)",
        () => {
          const cards = gsap.utils.toArray<HTMLElement>(".how-card");
          const dots = gsap.utils.toArray<HTMLElement>(".how-dot");
          const progressBar = containerRef.current?.querySelector(
            ".how-progress"
          ) as HTMLElement | null;

          if (containerRef.current) containerRef.current.style.height = "auto";
          cards.forEach((c) => {
            c.style.position = "relative";
            c.style.inset = "auto";
          });

          gsap.set(cards, {
            opacity: 1,
            y: 0,
            scale: 1,
            filter: "blur(0px)",
            clearProps: "zIndex",
          });
          gsap.set(dots, { backgroundColor: "var(--landing-accent)" });
          if (progressBar) gsap.set(progressBar, { scaleX: 1 });

          if (reduced) return;

          cards.forEach((card, i) => {
            gsap.from(card, {
              opacity: 0,
              y: 40,
              filter: "blur(6px)",
              duration: 0.8,
              ease: "power3.out",
              scrollTrigger: {
                trigger: card,
                start: "top 85%",
              },
              delay: i * 0.05,
            });
          });
        }
      );

      return () => mm.revert();
    },
    { scope: containerRef }
  );

  return (
    <section
      ref={containerRef}
      className="relative border-t border-[color:var(--landing-border)] how-section"
    >
      <div className="how-pin md:min-h-screen w-full flex flex-col justify-center px-6 sm:px-10 py-20 md:py-0">
        <div className="max-w-6xl mx-auto w-full">
          <div className="text-center mb-10 sm:mb-14 max-w-2xl mx-auto">
            <p className="landing-section-title mb-4">How it works</p>
            <h2
              className="text-[30px] sm:text-[44px] md:text-[56px] lg:text-[60px] text-[color:var(--landing-text)] leading-[1.05] mb-4"
              style={{
                fontFamily: "var(--font-hkgrotesk)",
                fontWeight: 600,
                letterSpacing: "-0.02em",
              }}
            >
              From your details to{" "}
              <span className="text-[color:var(--landing-accent)] italic">
                a designed biodata.
              </span>
            </h2>
            <p
              className="text-[15px] sm:text-[16px] text-[color:var(--landing-text-dim)] leading-relaxed"
              style={{ fontFamily: "var(--font-ranade)" }}
            >
              No Word documents. No PDF to re-send when something changes. No
              designer to hire. You enter the details. We design the rest, in
              your rashi&apos;s colours.
            </p>
          </div>

          <div className="how-stage relative max-w-3xl mx-auto md:h-[440px] flex flex-col gap-4 md:block">
            {steps.map((step, i) => (
              <Card key={i} step={step} index={i} />
            ))}
          </div>

          <div className="mt-10 hidden md:flex flex-col items-center gap-4">
            <div className="flex items-center gap-3">
              {steps.map((_, i) => (
                <span
                  key={i}
                  className="how-dot w-2 h-2 rounded-full transition-colors"
                />
              ))}
            </div>
            <div className="relative w-40 h-px bg-white/10 overflow-hidden">
              <span className="how-progress absolute inset-y-0 left-0 w-full bg-[color:var(--landing-accent)] origin-left scale-x-0" />
            </div>
            <p
              className="text-[10px] tracking-[0.32em] uppercase text-[color:var(--landing-text-muted)]"
              style={{ fontFamily: "var(--font-ranade)" }}
            >
              Scroll to advance
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Card({ step, index }: { step: Step; index: number }) {
  const Icon = step.icon;
  return (
    <article
      className="how-card w-full rounded-[20px] p-[1px] will-change-transform overflow-hidden"
      style={{
        zIndex: 10 + index,
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--landing-accent) 65%, transparent) 0%, color-mix(in srgb, var(--landing-accent) 12%, transparent) 35%, rgba(255,255,255,0.06) 60%, color-mix(in srgb, var(--landing-accent) 30%, transparent) 100%)",
        boxShadow:
          "0 30px 80px -20px color-mix(in srgb, var(--landing-accent) 35%, transparent), 0 0 0 1px rgba(255,255,255,0.04), 0 60px 120px -40px rgba(0,0,0,0.6)",
      }}
    >
      <div
        className="relative w-full h-full rounded-[19px] p-8 sm:p-12 flex flex-col gap-6 overflow-hidden"
        style={{
          background:
            "linear-gradient(160deg, rgba(30,32,44,0.78) 0%, rgba(18,20,30,0.72) 60%, rgba(30,32,44,0.82) 100%)",
          backdropFilter: "blur(28px) saturate(140%)",
          WebkitBackdropFilter: "blur(28px) saturate(140%)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-1/2 -left-1/3 w-[140%] h-[140%] opacity-60"
          style={{
            background:
              "radial-gradient(ellipse at top left, color-mix(in srgb, var(--landing-accent) 22%, transparent) 0%, transparent 55%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--landing-accent) 60%, transparent) 50%, transparent 100%)",
          }}
        />

        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <span
            className="text-[11px] tracking-[0.32em] uppercase text-[color:var(--landing-accent)]"
            style={{ fontFamily: "var(--font-ranade)", fontWeight: 600 }}
          >
            Step {String(index + 1).padStart(2, "0")} · {step.label}
          </span>
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--landing-accent) 28%, transparent), color-mix(in srgb, var(--landing-accent) 8%, transparent))",
              border:
                "1px solid color-mix(in srgb, var(--landing-accent) 55%, transparent)",
              boxShadow:
                "0 0 20px -4px color-mix(in srgb, var(--landing-accent) 55%, transparent), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            <Icon
              className="w-5 h-5 text-[color:var(--landing-accent)]"
              strokeWidth={1.5}
            />
          </div>
        </div>

        <h3
          className="relative text-[26px] sm:text-[36px] md:text-[42px] text-[color:var(--landing-text)] leading-[1.1]"
          style={{
            fontFamily: "var(--font-hkgrotesk)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          {step.title}
        </h3>

        <p
          className="relative text-[15px] sm:text-[17px] text-[color:var(--landing-text-dim)] leading-[1.65] max-w-2xl"
          style={{ fontFamily: "var(--font-ranade)" }}
        >
          {step.body}
        </p>

        <div
          className="relative mt-auto pt-6 flex items-center gap-3"
          style={{
            borderTop:
              "1px solid color-mix(in srgb, var(--landing-accent) 22%, transparent)",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full bg-[color:var(--landing-accent)]"
            style={{
              boxShadow:
                "0 0 12px 1px color-mix(in srgb, var(--landing-accent) 70%, transparent)",
            }}
          />
          <span
            className="text-[11px] sm:text-[12px] tracking-[0.24em] uppercase text-[color:var(--landing-accent)]"
            style={{ fontFamily: "var(--font-ranade)", fontWeight: 600 }}
          >
            {step.moat}
          </span>
        </div>
      </div>
    </article>
  );
}
