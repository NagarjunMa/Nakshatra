"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function FloatingCTA() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLAnchorElement>(null);

  useGSAP(
    () => {
      const wrap = wrapRef.current;
      const pill = pillRef.current;
      if (!wrap || !pill) return;

      gsap.set(wrap, {
        opacity: 0,
        y: -36,
        scale: 0.82,
        pointerEvents: "none",
        filter: "blur(6px)",
      });

      const breathe = gsap.to(pill, {
        scale: 1.045,
        boxShadow:
          "0 12px 48px -6px rgba(164,112,196,0.7), 0 0 0 6px rgba(164,112,196,0.08)",
        duration: 1.8,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        paused: true,
      });

      const showCTA = () => {
        gsap.killTweensOf(wrap);
        gsap.to(wrap, {
          opacity: 1,
          y: 0,
          scale: 1,
          filter: "blur(0px)",
          duration: 0.7,
          ease: "back.out(1.5)",
          pointerEvents: "auto",
          onComplete: () => breathe.play(),
        });
      };

      const hideCTA = () => {
        gsap.killTweensOf(wrap);
        breathe.pause();
        gsap.to(wrap, {
          opacity: 0,
          y: -36,
          scale: 0.82,
          filter: "blur(6px)",
          duration: 0.4,
          ease: "power2.in",
          pointerEvents: "none",
        });
      };

      const heroCTA = document.querySelector(
        "[data-hero-cta]",
      ) as HTMLElement | null;

      const trigger = ScrollTrigger.create({
        trigger: heroCTA ?? undefined,
        start: heroCTA ? "bottom 96px" : "top top",
        end: "max",
        onEnter: showCTA,
        onLeaveBack: hideCTA,
      });

      const press = () => {
        gsap.to(pill, {
          scale: 0.94,
          duration: 0.12,
          ease: "power2.out",
          yoyo: true,
          repeat: 1,
        });
      };
      pill.addEventListener("pointerdown", press);

      return () => {
        trigger.kill();
        breathe.kill();
        pill.removeEventListener("pointerdown", press);
      };
    },
    { scope: wrapRef },
  );

  return (
    <div
      ref={wrapRef}
      className="fixed bottom-4 right-4 sm:bottom-auto sm:top-[6rem] sm:right-6 z-[45]"
      style={{ willChange: "transform, opacity, filter" }}
      aria-hidden="false"
    >
      <Link
        ref={pillRef}
        href="/signup"
        className="landing-btn-primary !py-2.5 !px-5 !text-[11px]"
        aria-label="Create my biodata — start now"
        style={{
          boxShadow:
            "0 8px 32px -6px rgba(164,112,196,0.55), 0 0 0 1px rgba(164,112,196,0.18)",
        }}
      >
        Create my biodata
        <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
      </Link>
    </div>
  );
}
