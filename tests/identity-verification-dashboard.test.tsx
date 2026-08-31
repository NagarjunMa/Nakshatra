// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const startSelf = vi.hoisted(() => vi.fn());
const createInvitation = vi.hoisted(() => vi.fn());
vi.mock("@/features/identity-verification/client/identity-verification.api", () => ({
  startSelfIdentityVerificationRequest: startSelf,
  createIdentityVerificationInvitationRequest: createInvitation,
}));

import { IdentityVerificationDashboard } from "@/features/identity-verification/client/identity-verification-dashboard";

describe("identity-verification dashboard controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    startSelf.mockResolvedValue({ ok: true, data: { url: "https://verify.didit.me/session/opaque", managementUrl: "https://nakshatra.test/verify/manage" } });
    createInvitation.mockResolvedValue({ ok: true, data: { invitationUrl: "https://nakshatra.test/verify/invite", expiresAt: "2026-09-01T00:00:00.000Z" } });
  });

  it("requires consent for self-verification and exposes separate private recovery links", async () => {
    const user = userEvent.setup();
    render(<IdentityVerificationDashboard candidateId="candidate-id" />);

    const self = screen.getByRole("button", { name: "Verify myself" });
    expect(self).toBeDisabled();
    await user.click(screen.getByRole("checkbox"));
    await user.click(self);
    await waitFor(() => expect(startSelf).toHaveBeenCalledWith("candidate-id"));
    expect(screen.getByRole("link", { name: "Continue to Didit verification" })).toHaveAttribute("href", "https://verify.didit.me/session/opaque");
    expect(screen.getByRole("link", { name: "verification-management link" })).toHaveAttribute("href", "https://nakshatra.test/verify/manage");
  });

  it("creates an invitation without treating owner authorization as candidate consent", async () => {
    const user = userEvent.setup();
    render(<IdentityVerificationDashboard candidateId="candidate-id" />);

    await user.click(screen.getByRole("button", { name: "Create candidate invitation" }));
    await waitFor(() => expect(createInvitation).toHaveBeenCalledWith("candidate-id"));
    expect(screen.getByRole("link", { name: "https://nakshatra.test/verify/invite" })).toHaveAttribute("href", "https://nakshatra.test/verify/invite");
  });
});
