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
    fireEvent.click(screen.getByRole("button", { name: "Send interest" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
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
    render(<InterestRequestModal portfolioToken="portfolio-token" profileName="Ananya Rao" />);
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
      }),
    }));

    expect(response.status).toBe(201);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      portfolio_id: "portfolio-1",
      viewer_name: "Rohan Mehta",
      viewer_email: "rohan@example.com",
      viewer_family_context: null,
      message: null,
      requested_sections: ["full"],
      metadata: expect.objectContaining({
        country: null,
        state: null,
        city: null,
        location: null,
      }),
    }));

    const detailedResponse = await POST(new Request("http://local/api/interest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    expect(insert).toHaveBeenLastCalledWith(expect.objectContaining({
      viewer_family_context: "Our family lives in Toronto.",
      message: "We would be glad to connect.",
      metadata: expect.objectContaining({
        country: "Canada",
        state: "Ontario",
        city: "Toronto",
        location: "Toronto, Ontario, Canada",
        portfolio_url: "https://example.com/rohan",
      }),
    }));
  });
});
