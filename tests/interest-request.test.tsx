// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getApiUser = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({ getApiUser }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { InterestRequestModal } from "../src/components/portfolio/InterestRequestModal";
import { POST } from "../src/app/api/interest/route";

describe("interest request flow", () => {
  beforeEach(() => vi.clearAllMocks());

  it("submits from a modal and returns to the portfolio confirmation state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 201 })));
    render(<InterestRequestModal portfolioToken="portfolio-token" profileName="Ananya Rao" authenticated />);

    fireEvent.click(screen.getByRole("button", { name: "Show interest" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Your full name"), { target: { value: "Rohan Mehta" } });
    fireEvent.change(screen.getByLabelText("Contacting for"), { target: { value: "self" } });
    fireEvent.change(screen.getByLabelText("Phone number"), { target: { value: "+1 555 010 2200" } });
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "rohan@example.com" } });
    fireEvent.change(screen.getByLabelText("City and country"), { target: { value: "Toronto, Canada" } });
    fireEvent.change(screen.getByLabelText("Brief family introduction"), { target: { value: "Our family is based in Toronto and Bengaluru." } });
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "We would be glad to introduce our families." } });
    fireEvent.click(screen.getByRole("button", { name: "Send interest" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("Interest sent.")).toBeInTheDocument();
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        portfolioToken: "portfolio-token",
        name: "Rohan Mehta",
        profileFor: "self",
        phone: "+1 555 010 2200",
        email: "rohan@example.com",
        location: "Toronto, Canada",
        familyContext: "Our family is based in Toronto and Bengaluru.",
        message: "We would be glad to introduce our families.",
        portfolioUrl: "",
      }),
    }));

    expect(response.status).toBe(201);
    expect(rpc).toHaveBeenCalledWith("submit_public_interest", expect.objectContaining({
      p_share_token: "portfolio-token",
      p_name: "Rohan Mehta",
      p_email: "rohan@example.com",
    }));
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }));
    expect(response.status).toBe(401);
  });
});
