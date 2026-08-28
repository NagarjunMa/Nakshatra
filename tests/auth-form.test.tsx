// @vitest-environment jsdom

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const searchParams = vi.hoisted(() => ({ get: vi.fn<(key: string) => string | null>(() => null) }));
const replace = vi.hoisted(() => vi.fn());
const refresh = vi.hoisted(() => vi.fn());
const startAuthentication = vi.hoisted(() => vi.fn());
const verifyAuthenticationCode = vi.hoisted(() => vi.fn());
const continueToAuthProvider = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
  useRouter: () => ({ replace, refresh }),
}));
vi.mock("../src/features/auth/client/auth.api", () => ({
  startAuthentication,
  verifyAuthenticationCode,
  continueToAuthProvider,
}));

import { AuthForm } from "../src/components/auth/AuthForm";

describe("AuthForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParams.get.mockReturnValue(null);
  });

  it("creates an owner account and verifies the emailed code", async () => {
    startAuthentication.mockResolvedValueOnce({ ok: true, body: { verificationRequired: true, email: "new@example.com" } });
    verifyAuthenticationCode.mockResolvedValueOnce({ ok: true, body: { verified: true, redirect: "/dashboard" } });
    render(<AuthForm mode="signup" />);

    await userEvent.type(screen.getByLabelText("Your full name"), "Ananya Rao");
    await userEvent.type(screen.getByLabelText("Email address"), "new@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "Wedding2026");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(startAuthentication).toHaveBeenCalledWith({
      method: "password_signup",
      name: "Ananya Rao",
      email: "new@example.com",
      password: "Wedding2026",
      redirect: "/dashboard",
    });
    expect(await screen.findByRole("heading", { name: /six-digit code/i })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Verification code"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Verify and continue" }));
    expect(verifyAuthenticationCode).toHaveBeenCalledWith({ purpose: "owner_signup", email: "new@example.com", token: "123456", redirect: "/dashboard" });
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
  });

  it("signs in with email and password", async () => {
    startAuthentication.mockResolvedValueOnce({ ok: true, body: { authenticated: true, redirect: "/dashboard" } });
    render(<AuthForm mode="login" />);
    await userEvent.type(screen.getByLabelText("Email address"), "owner@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "Wedding2026");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(startAuthentication).toHaveBeenCalledWith({ method: "password_signin", email: "owner@example.com", password: "Wedding2026", redirect: "/dashboard" });
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
  });

  it("starts Google authentication through the same-origin gateway", async () => {
    startAuthentication.mockResolvedValueOnce({ ok: true, body: { url: "https://accounts.google.test/oauth" } });
    render(<AuthForm mode="login" />);
    await userEvent.click(screen.getByRole("button", { name: /google/i }));
    expect(startAuthentication).toHaveBeenCalledWith({ method: "google", redirect: "/dashboard" });
    expect(continueToAuthProvider).toHaveBeenCalledWith("https://accounts.google.test/oauth");
  });

  it("requests password recovery without revealing whether an account exists", async () => {
    startAuthentication.mockResolvedValueOnce({ ok: true, body: { sent: true } });
    render(<AuthForm mode="login" />);
    await userEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
    await userEvent.type(screen.getByLabelText("Email address"), "owner@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Send recovery email" }));
    expect(startAuthentication).toHaveBeenCalledWith({ method: "password_recovery", email: "owner@example.com" });
    expect(await screen.findByRole("heading", { name: "Check your email." })).toBeInTheDocument();
  });

  it("explains when the current session was explicitly revoked", () => {
    searchParams.get.mockImplementation((key: string) => key === "error" ? "session_revoked" : null);
    render(<AuthForm mode="login" />);
    expect(screen.getByRole("alert")).toHaveTextContent(/session has been signed out/i);
  });
});
