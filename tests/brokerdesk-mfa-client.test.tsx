// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const createClient = vi.hoisted(() => vi.fn());
const completeBrokerdeskMfa = vi.hoisted(() => vi.fn().mockRejectedValue(new Error("navigation stopped for test")));

vi.mock("@/lib/supabase/client", () => ({ createClient }));
vi.mock("@/features/organization-access/client/brokerdesk-mfa.api", () => ({ completeBrokerdeskMfa }));

import { BrokerdeskMfaClient } from "../src/app/brokerdesk/security/mfa/brokerdesk-mfa-client";

function mfaClient(options?: { verified?: boolean }) {
  const verified = options?.verified ?? true;
  return {
    auth: {
      mfa: {
        getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({
          data: { currentLevel: "aal1", nextLevel: "aal2" }, error: null,
        }),
        listFactors: vi.fn().mockResolvedValue({
          data: {
            all: verified ? [{ id: "factor-1", factor_type: "totp", status: "verified" }] : [],
            totp: verified ? [{ id: "factor-1", factor_type: "totp", status: "verified" }] : [],
            phone: [],
          },
          error: null,
        }),
        challengeAndVerify: vi.fn().mockResolvedValue({ data: {}, error: null }),
        unenroll: vi.fn().mockResolvedValue({ data: {}, error: null }),
        enroll: vi.fn().mockResolvedValue({
          data: {
            id: "factor-new",
            totp: {
              qr_code: "data:image/svg+xml;charset=utf-8,%3Csvg%3E%3C/svg%3E",
              secret: "PRIVATE-SETUP-KEY",
              uri: "otpauth://totp/example",
            },
          },
          error: null,
        }),
      },
    },
  };
}

describe("BrokerDesk MFA client", () => {
  beforeEach(() => vi.clearAllMocks());

  it("verifies an existing authenticator before requesting the server proof", async () => {
    const supabase = mfaClient();
    createClient.mockReturnValue(supabase);
    const user = userEvent.setup();
    render(<BrokerdeskMfaClient />);

    expect(await screen.findByRole("heading", { name: "Enter your authenticator code" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("6-digit code"), "123456");
    await user.click(screen.getByRole("button", { name: "Verify and continue" }));

    await waitFor(() => expect(supabase.auth.mfa.challengeAndVerify).toHaveBeenCalledWith({
      factorId: "factor-1",
      code: "123456",
    }));
    expect(completeBrokerdeskMfa).toHaveBeenCalledOnce();
  });

  it("guides a broker through first-time TOTP enrollment without sending the secret to the server", async () => {
    const supabase = mfaClient({ verified: false });
    createClient.mockReturnValue(supabase);
    const user = userEvent.setup();
    render(<BrokerdeskMfaClient />);

    await user.click(await screen.findByRole("button", { name: "Set up securely" }));
    expect(await screen.findByAltText("Authenticator setup QR code")).toBeInTheDocument();
    await user.click(screen.getByText("Cannot scan it?"));
    expect(screen.getByText("PRIVATE-SETUP-KEY")).toBeInTheDocument();
    expect(supabase.auth.mfa.enroll).toHaveBeenCalledWith({
      factorType: "totp",
      friendlyName: "Nakshatra BrokerDesk",
    });
    expect(completeBrokerdeskMfa).not.toHaveBeenCalled();
  });
});
