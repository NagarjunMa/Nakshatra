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
import ErrorPage from "../src/app/error";
import NotFound from "../src/app/not-found";
import { NewsletterForm } from "../src/components/landing/NewsletterForm";
import { RashiPalettePicker } from "../src/components/portfolio/RashiPalettePicker";
import { getRashiPalettes } from "../src/features/portfolio/rashi-theme";

describe("landing and shared frontend components", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the product promise, viewing modes, and primary actions", () => {
    render(<Home />);
    expect(screen.getAllByText(/Nakshatra/i).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /create/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /your wedding story, clearly together/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /balanced mode/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /private mode/i })).toBeInTheDocument();
    expect(screen.getAllByText(/identity verified/i).length).toBeGreaterThan(0);
  });

  it("submits the newsletter form", async () => {
    const user = userEvent.setup();
    render(<NewsletterForm />);
    await user.type(screen.getByRole("textbox"), "reader@example.com");
    await user.click(screen.getByRole("button"));
    expect(screen.getByText(/thank/i)).toBeInTheDocument();
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
