// @vitest-environment jsdom

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const signInWithOAuth = vi.hoisted(() => vi.fn());
const signInWithOtp = vi.hoisted(() => vi.fn());
const searchParams = vi.hoisted(() => ({ get: vi.fn(() => null) }));

vi.mock("next/navigation", () => ({ useSearchParams: () => searchParams }));
vi.mock("../src/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signInWithOAuth, signInWithOtp } }),
}));
vi.mock("shaders/react", () => {
  const Part = ({ children }: React.PropsWithChildren) => <div>{children}</div>;
  return { Shader: Part, ChromaFlow: Part, FilmGrain: Part, FlutedGlass: Part, Swirl: Part };
});

import { AuthForm } from "../src/components/auth/AuthForm";

describe("AuthForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInWithOAuth.mockResolvedValue({ error: null });
    signInWithOtp.mockResolvedValue({ error: null });
    searchParams.get.mockReturnValue(null);
  });

  it("starts Google authentication with a local callback", async () => {
    render(<AuthForm mode="login" />);
    await userEvent.click(screen.getByRole("button", { name: /google/i }));
    expect(signInWithOAuth).toHaveBeenCalledWith(expect.objectContaining({
      provider: "google",
      options: expect.objectContaining({ redirectTo: expect.stringContaining("/api/auth/callback") }),
    }));
  });

  it("submits a magic link and displays the sent state", async () => {
    render(<AuthForm mode="signup" />);
    await userEvent.type(screen.getByRole("textbox"), "new@example.com");
    await userEvent.click(screen.getByRole("button", { name: /sign-in link/i }));
    expect(signInWithOtp).toHaveBeenCalledWith(expect.objectContaining({ email: "new@example.com" }));
    expect(screen.getByRole("heading", { name: /check your inbox/i })).toBeInTheDocument();
    expect(screen.getByText(/may expire/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /send another link/i }));
    expect(signInWithOtp).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["google", signInWithOAuth],
    ["email", signInWithOtp],
  ])("shows a safe %s authentication error", async (kind, method) => {
    method.mockResolvedValueOnce({ error: { message: "provider failed" } });
    render(<AuthForm mode="login" />);
    if (kind === "email") {
      await userEvent.type(screen.getByRole("textbox"), "reader@example.com");
      await userEvent.click(screen.getByRole("button", { name: /sign-in link/i }));
    } else {
      await userEvent.click(screen.getByRole("button", { name: /google/i }));
    }
    expect(screen.getByText(/provider failed/i)).toBeInTheDocument();
  });
});
