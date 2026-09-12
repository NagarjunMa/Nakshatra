// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LandingExperience } from "../src/components/landing/LandingExperience";

describe("LandingExperience pilot messaging", () => {
  it("states the invitation boundary without blocking the viewer journey", () => {
    render(<LandingExperience variant="clarity" />);

    expect(screen.getAllByText(/invite-only private beta/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /creation is invited\. introductions can still travel/i })).toBeInTheDocument();
    expect(screen.getByText(/open a shared First View and express interest without a creator invitation/i)).toBeInTheDocument();
    expect(screen.getByText(/receive seven-day Full View access after approval/i)).toBeInTheDocument();
  });

  it("describes the free pilot, required verification, and current access periods", () => {
    render(<LandingExperience variant="clarity" />);

    expect(screen.getByText(/No payment or plan purchase is required/i)).toBeInTheDocument();
    expect(document.body).toHaveTextContent(/Didit identity verification is required before publication/i);
    expect(screen.getByText(/Public portfolio links are active for 30 days by default/i)).toBeInTheDocument();
    expect(screen.queryByText(/₹/)).not.toBeInTheDocument();
    expect(screen.queryByText(/choose a plan/i)).not.toBeInTheDocument();
  });

  it("uses invitation-aware creator calls to action and keeps sign-in available", () => {
    render(<LandingExperience variant="clarity" />);

    for (const link of screen.getAllByRole("link", { name: /pilot invitation/i })) {
      expect(link).toHaveAttribute("href", "/signup");
    }
    expect(screen.getByRole("link", { name: "Sign in to Nakshatra" })).toHaveAttribute("href", "/login");
  });
});
