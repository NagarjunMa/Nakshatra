// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const animation = vi.hoisted(() => ({
  play: vi.fn(),
  pause: vi.fn(),
  kill: vi.fn(),
}));
const gsap = vi.hoisted(() => ({
  registerPlugin: vi.fn(),
  set: vi.fn(),
  to: vi.fn((_target: unknown, options?: { onComplete?: () => void }) => {
    options?.onComplete?.();
    return animation;
  }),
  from: vi.fn(() => animation),
  killTweensOf: vi.fn(),
  timeline: vi.fn(() => ({ to: vi.fn().mockReturnThis(), from: vi.fn().mockReturnThis(), kill: vi.fn() })),
  matchMedia: vi.fn(() => ({
    add: vi.fn((_query: unknown, callback: () => void) => callback()),
    revert: vi.fn(),
  })),
  utils: { toArray: vi.fn(() => [document.createElement("div")]) },
}));
const trigger = vi.hoisted(() => ({ kill: vi.fn() }));
const scrollTrigger = vi.hoisted(() => ({
  batch: vi.fn((_items: unknown[], options: { onEnter?: (items: unknown[]) => void; onLeaveBack?: (items: unknown[]) => void }) => {
    options.onEnter?.([]);
    options.onLeaveBack?.([]);
  }),
  create: vi.fn((options: { onEnter?: () => void; onLeaveBack?: () => void }) => {
    options.onEnter?.();
    options.onLeaveBack?.();
    return trigger;
  }),
}));

vi.mock("gsap", () => ({ default: gsap }));
vi.mock("gsap/ScrollTrigger", () => ({ ScrollTrigger: scrollTrigger }));
vi.mock("@gsap/react", async () => {
  const ReactModule = await import("react");
  return {
    useGSAP: (callback: () => void | (() => void), config?: { dependencies?: unknown[] }) =>
      ReactModule.useEffect(callback, config?.dependencies ?? []),
  };
});
vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean; fill?: boolean }) => {
    const imageProps = { ...props };
    delete imageProps.priority;
    delete imageProps.fill;
    return React.createElement("img", { alt: "", ...imageProps });
  },
}));
vi.mock("shaders/react", () => {
  const Part = ({ children }: React.PropsWithChildren) => <div>{children}</div>;
  return { Shader: Part, ChromaFlow: Part, FilmGrain: Part, FlutedGlass: Part, Swirl: Part };
});

import Home from "../src/app/page";
import { LandingExperience } from "../src/components/landing/LandingExperience";
import ErrorPage from "../src/app/error";
import NotFound from "../src/app/not-found";
import { RashiPalettePicker } from "../src/components/portfolio/RashiPalettePicker";
import { getRashiPalettes } from "../src/features/portfolio/rashi-theme";

describe("landing and shared frontend components", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the concise product promise, access model, and primary actions", () => {
    render(<Home />);
    expect(screen.getAllByText(/Nakshatra/i).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /create/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /stop resending your biodata every time something changes/i })).toBeInTheDocument();
    expect(screen.getAllByText(/first view/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/full view/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /build first\. pay only when you are ready to publish/i })).toBeInTheDocument();
    expect(screen.getByText("₹2,450")).toBeInTheDocument();
    expect(screen.getByText(/outside india\? view pricing in usd/i)).toBeInTheDocument();
    expect(screen.getByText(/plans do not renew automatically/i)).toBeInTheDocument();
    expect(screen.getAllByText(/identity verified/i).length).toBeGreaterThan(0);
  });

  it("offers distinct privacy and story-led landing concepts", () => {
    const { rerender } = render(<LandingExperience variant="control" />);
    expect(screen.getByRole("heading", { name: /share your story\. not your privacy/i })).toBeInTheDocument();
    expect(screen.getByText(/full view needs your approval/i)).toBeInTheDocument();

    rerender(<LandingExperience variant="story" />);
    expect(screen.getByRole("heading", { name: /a biodata is a list\. this is how you’re introduced/i })).toBeInTheDocument();
    expect(screen.getByText(/opens in their browser/i)).toBeInTheDocument();
  });

  it("handles empty, selected, disabled, and selectable rashi palettes", async () => {
    const onSelect = vi.fn();
    const { rerender } = render(<RashiPalettePicker palettes={[]} onSelect={onSelect} />);
    expect(screen.getByText(/select a rashi/i)).toBeInTheDocument();

    const palettes = getRashiPalettes("tula");
    rerender(<RashiPalettePicker palettes={palettes} selectedPaletteId={palettes[0].id} onSelect={onSelect} />);
    expect(screen.getByRole("button", { name: /pastel pink/i })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: /cream/i }));
    expect(onSelect).toHaveBeenCalledWith(palettes[1]);

    rerender(<RashiPalettePicker palettes={palettes} onSelect={onSelect} disabled />);
    expect(screen.getAllByRole("button")[0]).toBeDisabled();
  });

  it("renders and resets the error boundary and the not-found page", () => {
    const reset = vi.fn();
    const { rerender } = render(<ErrorPage error={new Error("boom")} reset={reset} />);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(reset).toHaveBeenCalledOnce();
    rerender(<NotFound />);
    expect(screen.getByText(/not found/i)).toBeInTheDocument();
  });
});
