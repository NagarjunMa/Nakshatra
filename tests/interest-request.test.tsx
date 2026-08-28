// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getApiUser = vi.hoisted(() => vi.fn());
const enforceRateLimit = vi.hoisted(() => vi.fn());
const startAuthentication = vi.hoisted(() => vi.fn());
const verifyAuthenticationCode = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({ getApiUser }));
vi.mock("@/features/security/server/rate-limit.service", () => ({ enforceRateLimit }));
vi.mock("@/features/auth/client/auth.api", () => ({ startAuthentication, verifyAuthenticationCode }));

import { InterestRequestModal } from "../src/components/portfolio/InterestRequestModal";
import { POST } from "../src/app/api/interest/route";

function completeRequiredFields(email = "rohan@example.com") {
  fireEvent.change(screen.getByLabelText("Your full name"), { target: { value: "Rohan Mehta" } });
  fireEvent.change(screen.getByLabelText("Contacting for"), { target: { value: "self" } });
  fireEvent.change(screen.getByLabelText("Phone number"), { target: { value: "+1 555 010 2200" } });
  const emailField = screen.getByLabelText("Email address");
  if (!emailField.hasAttribute("readonly")) fireEvent.change(emailField, { target: { value: email } });
}

describe("interest request flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enforceRateLimit.mockResolvedValue(null);
    startAuthentication.mockResolvedValue({ ok: true, body: { sent: true } });
    verifyAuthenticationCode.mockResolvedValue({ ok: true, body: { verified: true, email: "rohan@example.com" } });
  });

  it("verifies an unauthenticated viewer inside the modal before submitting", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 201 })));
    render(<InterestRequestModal portfolioToken="portfolio-token" profileName="Ananya Rao" authenticated={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Show interest" }));
    completeRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "Verify email and continue" }));

    await waitFor(() => expect(startAuthentication).toHaveBeenCalledWith({ method: "email_otp", email: "rohan@example.com", redirect: "/p/portfolio-token" }));
    expect(await screen.findByRole("heading", { name: "Verify your email" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Six-digit code"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm and send interest" }));

    await waitFor(() => expect(verifyAuthenticationCode).toHaveBeenCalledWith({ purpose: "viewer_interest", email: "rohan@example.com", token: "123456", redirect: "/p/portfolio-token" }));
    expect(await screen.findByText(/Interest sent to Ananya's family/i)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/interest", expect.objectContaining({ method: "POST" }));
  });

  it("uses an already verified session without asking for another code", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 201 })));
    render(<InterestRequestModal portfolioToken="portfolio-token" profileName="Ananya Rao" authenticated verifiedEmail="verified@example.com" />);
    fireEvent.click(screen.getByRole("button", { name: "Show interest" }));
    completeRequiredFields();
    expect(screen.getByLabelText("Email address")).toHaveValue("verified@example.com");
    expect(screen.getByLabelText("Email address")).toHaveAttribute("readonly");
    fireEvent.click(screen.getByRole("button", { name: "Send interest" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(startAuthentication).not.toHaveBeenCalled();
  });

  it("keeps location and introductions optional", () => {
    render(<InterestRequestModal portfolioToken="portfolio-token" profileName="Ananya Rao" authenticated={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Show interest" }));
    expect(screen.getByLabelText("Your full name")).toBeRequired();
    expect(screen.getByLabelText("Phone number")).toBeRequired();
    expect(screen.getByLabelText("Your full name")).toHaveValue("");
    expect(screen.getByLabelText("Contacting for")).toHaveValue("");
    expect(screen.getByLabelText("Phone number")).toHaveValue("");
    expect(screen.getByLabelText("Email address")).toHaveValue("");
    fireEvent.click(screen.getByText("Add more details"));
    expect(screen.getByLabelText("Country")).not.toBeRequired();
    expect(screen.getByLabelText("State or province")).not.toBeRequired();
    expect(screen.getByLabelText("City")).not.toBeRequired();
    expect(screen.getByLabelText("Country")).toHaveValue("");
    expect(screen.getByLabelText("State or province")).toHaveValue("");
    expect(screen.getByLabelText("City")).toHaveValue("");
    expect(screen.getByLabelText("Brief family introduction")).toHaveValue("");
    expect(screen.getByLabelText("Message")).toHaveValue("");
    expect(screen.getByLabelText("Your portfolio link")).toHaveValue("");
  });

  it("disables interest on the signed-in owner's own portfolio", () => {
    render(<InterestRequestModal portfolioToken="portfolio-token" profileName="Ananya Rao" authenticated verifiedEmail="owner@example.com" isOwner />);

    const action = screen.getByRole("button", { name: "Show interest" });
    expect(action).toBeDisabled();
    expect(screen.getByText("This is your portfolio.")).toBeInTheDocument();
    fireEvent.click(action);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("stores an authenticated interest through the guarded database command", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    getApiUser.mockResolvedValue({ status: "authenticated", user: { id: "viewer-1" }, supabase: { rpc } });
    const response = await POST(new Request("http://local/api/interest", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://local" },
      body: JSON.stringify({ portfolioToken: "portfolio-token", name: "Rohan Mehta", profileFor: "self", phone: "+1 555 010 2200", email: "rohan@example.com" }),
    }));
    expect(response.status).toBe(201);
    expect(rpc).toHaveBeenCalledWith("submit_public_interest", expect.objectContaining({ p_email: "rohan@example.com" }));
  });

  it("rejects submission when the verification session is missing", async () => {
    getApiUser.mockResolvedValue({ status: "missing_session" });
    const response = await POST(new Request("http://local/api/interest", { method: "POST", headers: { "Content-Type": "application/json", Origin: "http://local" }, body: "{}" }));
    expect(response.status).toBe(401);
  });

  it("rejects malformed and cross-origin requests before persistence", async () => {
    getApiUser.mockResolvedValue({
      status: "authenticated",
      user: { id: "viewer-1" },
      supabase: { rpc: vi.fn() },
    });
    const invalid = await POST(new Request("http://local/api/interest", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://local" },
      body: "{}",
    }));
    expect(invalid.status).toBe(400);

    const crossOrigin = await POST(new Request("http://local/api/interest", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://attacker.test" },
      body: "{}",
    }));
    expect(crossOrigin.status).toBe(403);
  });

  it("explains invalid optional portfolio links instead of blaming required fields", async () => {
    const rpc = vi.fn();
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
        portfolioUrl: "http://localhost:3000/p/portfolio-token",
      }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "INTEREST_REQUEST_INVALID",
      error: expect.stringContaining("https://"),
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("explains that an owner cannot send interest to their own portfolio", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "22023", message: "portfolio owner cannot request own portfolio" },
    });
    getApiUser.mockResolvedValue({
      status: "authenticated",
      user: { id: "owner-1" },
      supabase: { rpc },
    });
    const response = await POST(new Request("http://local/api/interest", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://local" },
      body: JSON.stringify({
        portfolioToken: "portfolio-token",
        name: "Portfolio Owner",
        profileFor: "self",
        phone: "+1 555 010 2200",
        email: "owner@example.com",
      }),
    }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: "OWN_PORTFOLIO_INTEREST",
      error: expect.stringContaining("own portfolio"),
    });
  });

  it.each([
    {
      databaseError: { code: "23505", message: 'duplicate key value violates unique constraint "idx_interest_requests_candidate_prospect"' },
      expectedStatus: 409,
      expectedCode: "INTEREST_REQUEST_EXISTS",
    },
    {
      databaseError: { code: "42501", message: "verified email required" },
      expectedStatus: 403,
      expectedCode: "VERIFIED_EMAIL_REQUIRED",
    },
    {
      databaseError: { code: "PGRST202", message: "Could not find the function public.submit_public_interest" },
      expectedStatus: 503,
      expectedCode: "INTEREST_DATABASE_UPDATE_REQUIRED",
    },
  ])("returns an actionable response for $expectedCode", async ({ databaseError, expectedStatus, expectedCode }) => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: databaseError });
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

    expect(response.status).toBe(expectedStatus);
    await expect(response.json()).resolves.toMatchObject({ code: expectedCode });
  });

  it("returns bounded responses for rate limits, unavailable portfolios, and persistence failures", async () => {
    const payload = JSON.stringify({
      portfolioToken: "portfolio-token",
      name: "Rohan Mehta",
      profileFor: "self",
      phone: "+1 555 010 2200",
      email: "rohan@example.com",
    });
    const rpc = vi.fn().mockResolvedValueOnce({ data: false, error: null });
    getApiUser.mockResolvedValue({
      status: "authenticated",
      user: { id: "viewer-1" },
      supabase: { rpc },
    });
    const unavailable = await POST(new Request("http://local/api/interest", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://local" },
      body: payload,
    }));
    expect(unavailable.status).toBe(404);

    const limitedResponse = new Response(JSON.stringify({ error: "Try later" }), { status: 429 });
    enforceRateLimit.mockResolvedValueOnce(limitedResponse);
    const limited = await POST(new Request("http://local/api/interest", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://local" },
      body: payload,
    }));
    expect(limited.status).toBe(429);

    enforceRateLimit.mockResolvedValue(null);
    rpc.mockRejectedValueOnce(new Error("database unavailable"));
    const failed = await POST(new Request("http://local/api/interest", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://local" },
      body: payload,
    }));
    expect(failed.status).toBe(500);
  });
});
