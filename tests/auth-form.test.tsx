// @vitest-environment jsdom

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const searchParams = vi.hoisted(() => ({ get: vi.fn(() => null) }));
const startAuthentication = vi.hoisted(() => vi.fn());
const continueToAuthProvider = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ useSearchParams: () => searchParams }));
vi.mock("../src/features/auth/client/auth.api", () => ({
  startAuthentication,
  continueToAuthProvider,
}));
vi.mock("shaders/react", () => {
  const Part = ({ children }: React.PropsWithChildren) => <div>{children}</div>;
  return { Shader: Part, ChromaFlow: Part, FilmGrain: Part, FlutedGlass: Part, Swirl: Part };
});

import { AuthForm } from "../src/components/auth/AuthForm";

describe("AuthForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    startAuthentication.mockResolvedValue({ ok: true, body: { sent: true } });
    searchParams.get.mockReturnValue(null);
  });

  it("starts Google authentication with a local callback", async () => {
    startAuthentication.mockResolvedValueOnce({ ok: true, body: { url: "https://accounts.google.test/oauth" } });
    render(<AuthForm mode="login" />);
    await userEvent.click(screen.getByRole("button", { name: /google/i }));
    expect(startAuthentication).toHaveBeenCalledWith({ method: "google", redirect: "/dashboard" });
    expect(continueToAuthProvider).toHaveBeenCalledWith("https://accounts.google.test/oauth");
  });

  it("submits a magic link and displays the sent state", async () => {
    render(<AuthForm mode="signup" />);
    await userEvent.type(screen.getByRole("textbox"), "new@example.com");
    await userEvent.click(screen.getByRole("button", { name: /sign-in link/i }));
    expect(startAuthentication).toHaveBeenCalledWith({ method: "email", email: "new@example.com", redirect: "/dashboard" });
    expect(await screen.findByRole("heading", { name: /check your inbox/i })).toBeInTheDocument();
    expect(screen.getByText(/may expire/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /send another link/i }));
    expect(startAuthentication).toHaveBeenCalledTimes(2);
  });

  it.each(["google", "email"])("shows a safe %s authentication error", async (kind) => {
    startAuthentication.mockResolvedValueOnce({ ok: false, body: { error: "Sign in is temporarily unavailable." } });
    render(<AuthForm mode="login" />);
    if (kind === "email") {
      await userEvent.type(screen.getByRole("textbox"), "reader@example.com");
      await userEvent.click(screen.getByRole("button", { name: /sign-in link/i }));
    } else {
      await userEvent.click(screen.getByRole("button", { name: /google/i }));
    }
    await waitFor(() => expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument());
  });
});
