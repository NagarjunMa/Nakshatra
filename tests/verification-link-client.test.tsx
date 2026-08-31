// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getLink = vi.hoisted(() => vi.fn());
const startInvitation = vi.hoisted(() => vi.fn());
const retry = vi.hoisted(() => vi.fn());
const withdraw = vi.hoisted(() => vi.fn());
vi.mock("@/features/identity-verification/client/identity-verification.api", () => ({
  getIdentityVerificationLinkRequest: getLink,
  startInvitationIdentityVerificationRequest: startInvitation,
  retryIdentityVerificationRequest: retry,
  withdrawIdentityVerificationConsentRequest: withdraw,
}));

import { VerificationLinkClient } from "@/app/verify/[token]/verification-link-client";

describe("verification bearer-link page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    startInvitation.mockResolvedValue({ ok: false, message: "Provider is unavailable", managementUrl: "https://nakshatra.test/verify/manage" });
    retry.mockResolvedValue({ ok: false, message: "Retry unavailable" });
    withdraw.mockResolvedValue({ ok: true, data: { withdrawn: true } });
  });

  it("shows a standalone consent notice without candidate details and requires affirmative consent", async () => {
    getLink.mockResolvedValue({ ok: true, data: { link: { kind: "invitation", status: "ready" } } });
    startInvitation.mockResolvedValueOnce({ ok: true, data: { url: "https://verify.didit.test/session/opaque", managementUrl: "https://nakshatra.test/verify/manage" } });
    const user = userEvent.setup();
    render(<VerificationLinkClient token="opaque-token" />);
    await screen.findByText("Confirm your identity");
    expect(screen.getByText(/Didit will run the hosted identity check/)).toBeInTheDocument();
    expect(screen.queryByText(/Private Candidate/)).not.toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Continue to Didit" });
    expect(button).toBeDisabled();
    await user.click(screen.getByRole("checkbox"));
    await user.click(button);
    expect(startInvitation).toHaveBeenCalledWith("opaque-token");
    expect(screen.getByRole("link", { name: "verification management" })).toHaveAttribute("href", "https://nakshatra.test/verify/manage");
    expect(screen.getByRole("link", { name: "Continue to Didit verification" })).toHaveAttribute("href", "https://verify.didit.test/session/opaque");
  });

  it("supports generic management status, withdrawal, and retry without rendering provider details", async () => {
    getLink.mockResolvedValue({ ok: true, data: { link: { kind: "management", status: "failed", canRetry: true, canWithdraw: true } } });
    const user = userEvent.setup();
    render(<VerificationLinkClient token="management-token" />);
    await screen.findByText("Verification management");
    expect(screen.getByText("failed")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry verification" }));
    expect(retry).toHaveBeenCalledWith("management-token");
    await user.click(screen.getByRole("button", { name: "Withdraw consent" }));
    await waitFor(() => expect(withdraw).toHaveBeenCalledWith("management-token"));
    expect(await screen.findByText("revoked")).toBeInTheDocument();
  });

  it("renders a safe unavailable state for invalid or expired links", async () => {
    getLink.mockResolvedValue({ ok: false, message: "This verification link is unavailable or has expired." });
    render(<VerificationLinkClient token="invalid-token" />);
    expect(await screen.findByText("Verification link unavailable")).toBeInTheDocument();
  });
});
