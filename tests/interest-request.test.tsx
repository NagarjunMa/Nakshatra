// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const createClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({ createClient }));

import { InterestRequestModal } from "../src/components/portfolio/InterestRequestModal";
import { POST } from "../src/app/api/interest/route";

describe("interest request flow", () => {
  beforeEach(() => vi.clearAllMocks());

  it("submits from a modal and returns to the portfolio confirmation state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 201 })));
    render(<InterestRequestModal portfolioToken="portfolio-token" profileName="Ananya Rao" />);

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
    const insert = vi.fn().mockResolvedValue({ error: null });
    const single = vi.fn().mockResolvedValue({ data: { portfolio_id: "portfolio-1" } });
    const eqActive = vi.fn(() => ({ single }));
    const eqToken = vi.fn(() => ({ eq: eqActive }));
    const select = vi.fn(() => ({ eq: eqToken }));
    createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn((table: string) => table === "public_portfolio_snapshots" ? { select } : { insert }),
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
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      portfolio_id: "portfolio-1",
      viewer_name: "Rohan Mehta",
      viewer_email: "rohan@example.com",
      requested_sections: ["full"],
    }));
  });
});
