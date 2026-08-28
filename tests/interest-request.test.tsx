// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getApiUser = vi.hoisted(() => vi.fn());
const enforceRateLimit = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({ getApiUser }));
vi.mock("@/features/security/server/rate-limit.service", () => ({ enforceRateLimit }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { InterestRequestModal } from "../src/components/portfolio/InterestRequestModal";
import { POST } from "../src/app/api/interest/route";

describe("interest request flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enforceRateLimit.mockResolvedValue(null);
  });

  it("submits from a modal and returns to the portfolio confirmation state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 201 })));
    render(<InterestRequestModal portfolioToken="portfolio-token" profileName="Ananya Rao" authenticated />);

    fireEvent.click(screen.getByRole("button", { name: "Show interest" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.change(screen.getByLabelText("Your full name"), { target: { value: "Rohan Mehta" } });
    fireEvent.change(screen.getByLabelText("Contacting for"), { target: { value: "self" } });
    fireEvent.change(screen.getByLabelText("Phone number"), { target: { value: "+1 555 010 2200" } });
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "rohan@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send interest" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(document.body.style.overflow).toBe("");
    });
    expect(screen.getByText("Interest sent.")).toBeInTheDocument();
    const request = vi.mocked(fetch).mock.calls[0];
    const submitted = JSON.parse(String((request[1] as RequestInit).body));
    expect(submitted).toMatchObject({
      name: "Rohan Mehta",
      profileFor: "self",
      phone: "+1 555 010 2200",
      email: "rohan@example.com",
      country: "",
      state: "",
      city: "",
      familyContext: "",
      message: "",
    });
  });

  it("keeps location and introductions optional in the form", () => {
    render(<InterestRequestModal portfolioToken="portfolio-token" profileName="Ananya Rao" authenticated />);
    fireEvent.click(screen.getByRole("button", { name: "Show interest" }));

    expect(screen.getByLabelText("Your full name")).toBeRequired();
    expect(screen.getByLabelText("Contacting for")).toBeRequired();
    expect(screen.getByLabelText("Phone number")).toBeRequired();
    expect(screen.getByLabelText("Email address")).toBeRequired();
    fireEvent.click(screen.getByText("Add more details"));
    expect(screen.getByLabelText("Country")).not.toBeRequired();
    expect(screen.getByLabelText("State or province")).not.toBeRequired();
    expect(screen.getByLabelText("City")).not.toBeRequired();
    expect(screen.getByLabelText("Brief family introduction")).not.toBeRequired();
    expect(screen.getByLabelText("Message")).not.toBeRequired();
  });

  it("validates and stores an interest for an active portfolio", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    getApiUser.mockResolvedValue({
      status: "authenticated",
      user: { id: "viewer-1" },
      supabase: { rpc },
    });

    const response = await POST(new Request("http://local/api/interest", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://local" },
      body: JSON.stringify({
        portfolioToken: "portfolio-token",
        name: "Rohan Mehta",
        profileFor: "self",
        phone: "+1 555 010 2200",
        email: "rohan@example.com",
      }),
    }));

    expect(response.status).toBe(201);
    expect(rpc).toHaveBeenCalledWith("submit_public_interest", {
      p_share_token: "portfolio-token",
      p_name: "Rohan Mehta",
      p_profile_for: "self",
      p_phone: "+1 555 010 2200",
      p_email: "rohan@example.com",
      p_location: null,
      p_family_context: null,
      p_message: null,
      p_portfolio_url: null,
      p_country: null,
      p_state: null,
      p_city: null,
    });

    const detailedResponse = await POST(new Request("http://local/api/interest", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://local" },
      body: JSON.stringify({
        portfolioToken: "portfolio-token",
        name: "Rohan Mehta",
        profileFor: "self",
        phone: "+1 555 010 2200",
        email: "rohan@example.com",
        country: "Canada",
        state: "Ontario",
        city: "Toronto",
        familyContext: "Our family lives in Toronto.",
        message: "We would be glad to connect.",
        portfolioUrl: "https://example.com/rohan",
      }),
    }));

    expect(detailedResponse.status).toBe(201);
    expect(rpc).toHaveBeenLastCalledWith("submit_public_interest", {
      p_share_token: "portfolio-token",
      p_name: "Rohan Mehta",
      p_profile_for: "self",
      p_phone: "+1 555 010 2200",
      p_email: "rohan@example.com",
      p_location: "Toronto, Ontario, Canada",
      p_family_context: "Our family lives in Toronto.",
      p_message: "We would be glad to connect.",
      p_portfolio_url: "https://example.com/rohan",
      p_country: "Canada",
      p_state: "Ontario",
      p_city: "Toronto",
    });
  });

  it("requires sign-in before showing or accepting an interest request", async () => {
    render(<InterestRequestModal portfolioToken="portfolio-token" profileName="Ananya Rao" authenticated={false} />);
    expect(screen.getByRole("link", { name: "Sign in to show interest" })).toHaveAttribute(
      "href",
      "/login?redirect=%2Fp%2Fportfolio-token"
    );

    getApiUser.mockResolvedValue({ status: "missing_session" });
    const response = await POST(new Request("http://local/api/interest", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://local" },
      body: JSON.stringify({}),
    }));
    expect(response.status).toBe(401);
  });
});
