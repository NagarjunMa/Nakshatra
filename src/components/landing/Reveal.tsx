"use client";

import { useRef, ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type RevealProps = {
  children: ReactNode;
  selector?: string;
  stagger?: number;
  y?: number;
  duration?: number;
  start?: string;
  once?: boolean;
};

export function Reveal({
  children,
  selector = ".reveal",
  stagger = 0.08,
  y = 40,
  duration = 0.9,
  start = "top 85%",
  once = false,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const items = gsap.utils.toArray<HTMLElement>(selector);
      if (!items.length) return;

      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      if (reduced) {
        gsap.set(items, { opacity: 1, y: 0, filter: "blur(0px)" });
        return;
      }

      gsap.set(items, { opacity: 0, y, filter: "blur(6px)" });

      ScrollTrigger.batch(items, {
        start,
        once,
        onEnter: (batch) =>
          gsap.to(batch, {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration,
            ease: "power3.out",
            stagger,
            overwrite: "auto",
          }),
        onLeaveBack: once
          ? undefined
          : (batch) =>
              gsap.to(batch, {
                opacity: 0,
                y,
                filter: "blur(6px)",
                duration: duration * 0.45,
                ease: "power2.in",
                overwrite: "auto",
              }),
      });
    },
    { scope: ref }
  );

  return <div ref={ref}>{children}</div>;
}
