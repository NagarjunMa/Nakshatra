// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const updateRecoveredPassword = vi.hoisted(() => vi.fn());
const replace = vi.hoisted(() => vi.fn());
const refresh = vi.hoisted(() => vi.fn());

vi.mock("@/features/auth/client/auth.api", () => ({ updateRecoveredPassword }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh }) }));

import { ResetPasswordForm } from "../src/components/auth/ResetPasswordForm";
import ResetPasswordPage, { metadata } from "../src/app/reset-password/page";

describe("password recovery form", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateRecoveredPassword.mockResolvedValue({ ok: true, body: { updated: true } });
  });

  it("renders the private reset-password page metadata and form", () => {
    render(<ResetPasswordPage />);
    expect(screen.getByRole("heading", { name: "Choose a new password." })).toBeInTheDocument();
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("requires matching passwords before submitting", async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm />);
    await user.type(screen.getByLabelText("New password"), "new-password");
    await user.type(screen.getByLabelText("Confirm new password"), "different-password");
    await user.click(screen.getByRole("button", { name: "Save new password" }));
    expect(screen.getByRole("alert")).toHaveTextContent("The passwords do not match.");
    expect(updateRecoveredPassword).not.toHaveBeenCalled();
  });

  it("updates the password and returns to the dashboard", async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm />);
    await user.type(screen.getByLabelText("New password"), "new-password");
    await user.type(screen.getByLabelText("Confirm new password"), "new-password");
    await user.click(screen.getByRole("button", { name: "Save new password" }));
    expect(updateRecoveredPassword).toHaveBeenCalledWith("new-password");
    expect(replace).toHaveBeenCalledWith("/dashboard?password=updated");
    expect(refresh).toHaveBeenCalled();
  });

  it("shows a safe recovery error and supports password visibility", async () => {
    const user = userEvent.setup();
    updateRecoveredPassword.mockResolvedValueOnce({
      ok: false,
      body: { error: "This recovery link has expired." },
    });
    render(<ResetPasswordForm />);
    const password = screen.getByLabelText("New password");
    expect(password).toHaveAttribute("type", "password");
    await user.click(screen.getAllByRole("button", { name: "Show password" })[0]);
    expect(password).toHaveAttribute("type", "text");
    await user.type(password, "new-password");
    await user.type(screen.getByLabelText("Confirm new password"), "new-password");
    await user.click(screen.getByRole("button", { name: "Save new password" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("This recovery link has expired.");
  });
});
