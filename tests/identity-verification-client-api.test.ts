import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createIdentityVerificationInvitationRequest,
  getIdentityVerificationLinkRequest,
  retryIdentityVerificationRequest,
  startInvitationIdentityVerificationRequest,
  startSelfIdentityVerificationRequest,
  withdrawIdentityVerificationConsentRequest,
} from "@/features/identity-verification/client/identity-verification.api";

describe("identity verification client API", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses JSON bodies instead of URLs for bearer-token API calls", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ link: { kind: "invitation", status: "ready" } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(getIdentityVerificationLinkRequest("token")).resolves.toEqual({ ok: true, data: { link: { kind: "invitation", status: "ready" } } });
    expect(fetchMock).toHaveBeenCalledWith("/api/identity-verification/status", expect.objectContaining({ method: "POST", body: JSON.stringify({ token: "token" }) }));
  });

  it("starts both authorized flows, creates invitations, retries, and withdraws with narrowly scoped routes", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ url: "https://verify.didit.test/session", managementUrl: "https://nakshatra.test/verify/manage" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ url: "https://verify.didit.test/self", managementUrl: "https://nakshatra.test/verify/self" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ invitationUrl: "https://nakshatra.test/verify/invite", expiresAt: "2026-09-01T00:00:00.000Z" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ url: "https://verify.didit.test/retry", managementUrl: "https://nakshatra.test/verify/retry" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ withdrawn: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(startInvitationIdentityVerificationRequest("token")).resolves.toMatchObject({ ok: true });
    await expect(startSelfIdentityVerificationRequest("candidate-id")).resolves.toMatchObject({ ok: true });
    await expect(createIdentityVerificationInvitationRequest("candidate-id")).resolves.toMatchObject({ ok: true });
    await expect(retryIdentityVerificationRequest("token")).resolves.toMatchObject({ ok: true });
    await expect(withdrawIdentityVerificationConsentRequest("token")).resolves.toEqual({ ok: true, data: { withdrawn: true } });
    expect(fetchMock.mock.calls.map(([url, init]) => [url, init.method])).toEqual([
      ["/api/identity-verification/start", "POST"],
      ["/api/identity-verification/start", "POST"],
      ["/api/identity-verification/invitations", "POST"],
      ["/api/identity-verification/retry", "POST"],
      ["/api/identity-verification/status", "DELETE"],
    ]);
    expect(fetchMock.mock.calls[1][1].body).toBe(JSON.stringify({ authorization: "self", candidateId: "candidate-id", consent: true }));
    expect(fetchMock.mock.calls[2][1].body).toBe(JSON.stringify({ candidateId: "candidate-id" }));
  });

  it("maps server and network errors to stable frontend failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: "IDENTITY_VERIFICATION_LINK_INVALID", error: "Unavailable", managementUrl: "https://nakshatra.test/verify/private" }), { status: 400 })));
    await expect(getIdentityVerificationLinkRequest("token")).resolves.toEqual({ ok: false, code: "IDENTITY_VERIFICATION_LINK_INVALID", message: "Unavailable", status: 400, managementUrl: "https://nakshatra.test/verify/private" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(getIdentityVerificationLinkRequest("token")).resolves.toMatchObject({ ok: false, code: "NETWORK_UNAVAILABLE", status: 0 });
  });
});
