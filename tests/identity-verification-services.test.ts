import { beforeEach, describe, expect, it, vi } from "vitest";

const createDiditVerificationSession = vi.hoisted(() => vi.fn());
vi.mock("@/features/identity-verification/server/didit.provider", () => ({
  createDiditVerificationSession,
  DiditProviderError: class DiditProviderError extends Error {},
}));

import { createIdentityVerificationInvitation, IdentityVerificationInvitationError } from "@/features/identity-verification/server/invitation.service";
import {
  getIdentityVerificationLinkStatus,
  IdentityVerificationSessionError,
  retryIdentityVerification,
  startIdentityVerification,
  withdrawIdentityVerificationConsent,
} from "@/features/identity-verification/server/session.service";

const prepared = {
  attempt_id: "11111111-1111-4111-8111-111111111111",
  provider_subject_ref: "22222222-2222-4222-8222-222222222222",
  legal_name: "Private Candidate",
  birth_date: "1994-02-20",
};

function supabaseWith(results: Array<{ data?: unknown; error?: unknown }>) {
  const rpc = vi.fn(() => Promise.resolve(results.shift() ?? { data: null, error: null }));
  return { rpc } as never;
}

describe("identity-verification services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createDiditVerificationSession.mockResolvedValue({ sessionId: "provider-session", url: "https://verify.didit.test/session" });
  });

  it("creates a candidate invitation and maps authorization/database failures safely", async () => {
    await expect(createIdentityVerificationInvitation({
      supabase: supabaseWith([{ data: "2026-09-01T00:00:00.000Z", error: null }]), candidateId: "candidate", tokenHash: "a".repeat(64),
    })).resolves.toEqual({ expiresAt: "2026-09-01T00:00:00.000Z" });
    await expect(createIdentityVerificationInvitation({
      supabase: supabaseWith([{ data: null, error: { code: "42501" } }]), candidateId: "candidate", tokenHash: "a".repeat(64),
    })).rejects.toEqual(expect.objectContaining<Partial<IdentityVerificationInvitationError>>({ code: "IDENTITY_VERIFICATION_FORBIDDEN", status: 403 }));
    await expect(createIdentityVerificationInvitation({
      supabase: supabaseWith([{ data: "bad", error: null }]), candidateId: "candidate", tokenHash: "a".repeat(64),
    })).rejects.toEqual(expect.objectContaining<Partial<IdentityVerificationInvitationError>>({ code: "IDENTITY_VERIFICATION_INVITATION_FAILED", status: 503 }));
  });

  it("prepares consent-backed verification, sends PII only to Didit, and attaches the returned reference", async () => {
    const supabase = supabaseWith([{ data: [prepared], error: null }, { data: null, error: null }]);
    await expect(startIdentityVerification({
      supabase,
      candidateId: null,
      invitationTokenHash: "a".repeat(64),
      managementToken: "management-token",
      managementTokenHash: "b".repeat(64),
      callbackUrl: "https://nakshatra.test/verification/result",
    })).resolves.toEqual({ url: "https://verify.didit.test/session" });
    expect(createDiditVerificationSession).toHaveBeenCalledWith(expect.objectContaining({ legalName: "Private Candidate", birthDate: "1994-02-20" }));
    expect((supabase as { rpc: ReturnType<typeof vi.fn> }).rpc).toHaveBeenLastCalledWith("attach_identity_verification_provider_session", expect.objectContaining({
      p_attempt_id: prepared.attempt_id,
      p_provider_session_ref: "provider-session",
      p_management_token_hash: "b".repeat(64),
    }));
  });

  it("returns the management credential only after consent preparation when Didit is unavailable", async () => {
    createDiditVerificationSession.mockRejectedValueOnce(new Error("provider"));
    await expect(startIdentityVerification({
      supabase: supabaseWith([{ data: prepared, error: null }]), candidateId: "candidate", invitationTokenHash: null,
      managementToken: "management-token", managementTokenHash: "b".repeat(64), callbackUrl: "https://nakshatra.test/result",
    })).rejects.toEqual(expect.objectContaining<Partial<IdentityVerificationSessionError>>({
      code: "IDENTITY_VERIFICATION_PROVIDER_UNAVAILABLE", managementToken: "management-token", status: 503,
    }));
  });

  it("maps link inspection, withdrawal, and retry through generic persistence contracts", async () => {
    await expect(getIdentityVerificationLinkStatus(supabaseWith([{ data: { kind: "invitation", status: "ready" }, error: null }]), "a".repeat(64)))
      .resolves.toEqual({ kind: "invitation", status: "ready" });
    await expect(getIdentityVerificationLinkStatus(supabaseWith([{ data: null, error: { code: "22023" } }]), "a".repeat(64)))
      .rejects.toEqual(expect.objectContaining<Partial<IdentityVerificationSessionError>>({ code: "IDENTITY_VERIFICATION_LINK_INVALID", status: 400 }));
    await expect(withdrawIdentityVerificationConsent(supabaseWith([{ data: null, error: null }]), "a".repeat(64))).resolves.toBeUndefined();

    const supabase = supabaseWith([{ data: [prepared], error: null }, { data: null, error: null }]);
    await expect(retryIdentityVerification({
      supabase, tokenHash: "a".repeat(64), managementToken: "next-management", managementTokenHash: "b".repeat(64), callbackUrl: "https://nakshatra.test/result",
    })).resolves.toEqual({ url: "https://verify.didit.test/session" });
  });

  it("fails closed for malformed prepared records and persistence failures", async () => {
    await expect(startIdentityVerification({
      supabase: supabaseWith([{ data: { attempt_id: "not-uuid" }, error: null }]), candidateId: null, invitationTokenHash: "a".repeat(64),
      managementToken: "management", managementTokenHash: "b".repeat(64), callbackUrl: "https://nakshatra.test/result",
    })).rejects.toEqual(expect.objectContaining<Partial<IdentityVerificationSessionError>>({ code: "IDENTITY_VERIFICATION_START_FAILED" }));
    await expect(withdrawIdentityVerificationConsent(supabaseWith([{ data: null, error: { code: "22023" } }]), "a".repeat(64)))
      .rejects.toEqual(expect.objectContaining<Partial<IdentityVerificationSessionError>>({ code: "IDENTITY_VERIFICATION_LINK_INVALID" }));
  });
});
