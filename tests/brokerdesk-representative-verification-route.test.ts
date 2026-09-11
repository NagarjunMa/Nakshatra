import { beforeEach, describe, expect, it, vi } from "vitest";

const getApiUser = vi.hoisted(() => vi.fn());
const enforceRateLimit = vi.hoisted(() => vi.fn());
const startVerification = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({ getApiUser }));
vi.mock("@/features/security/server/rate-limit.service", () => ({ enforceRateLimit }));
vi.mock("@/features/identity-verification/server/session.service", () => ({
  IdentityVerificationSessionError: class IdentityVerificationSessionError extends Error {
    constructor(message: string, readonly code: string, readonly status: number, readonly managementToken?: string) { super(message); }
  },
  startBrokerdeskRepresentativeVerification: startVerification,
}));
vi.mock("@/lib/security/logging", () => ({ getRequestId: () => "request-id", logServerError: vi.fn() }));

import { POST } from "../src/app/api/v1/brokerdesk/workspaces/[workspaceRef]/representative-verification/route";
import { createBrokerdeskProofCookie } from "@/features/organization-access/server/brokerdesk-reauth-cookie";
import { IdentityVerificationSessionError } from "@/features/identity-verification/server/session.service";

const origin = "http://local";
const workspaceRef = `wrk_${"a".repeat(32)}`;
const actor = { status: "authenticated" as const, user: { id: "11111111-1111-4111-8111-111111111111", sessionId: "session" }, supabase: {} };
const context = { params: Promise.resolve({ workspaceRef }) };

function request(
  body: object,
  cookie = createBrokerdeskProofCookie({
    challengeId: "22222222-2222-4222-8222-222222222222",
    workspaceRef,
    purpose: "verification_manage",
    proof: "p".repeat(43),
  }),
  requestOrigin = origin
) {
  return new Request(`${origin}/api/v1/brokerdesk/workspaces/${workspaceRef}/representative-verification`, {
    method: "POST",
    headers: { Origin: requestOrigin, "Content-Type": "application/json", Cookie: `${cookie.name}=${cookie.value}` },
    body: JSON.stringify(body),
  });
}

describe("BrokerDesk representative verification route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getApiUser.mockResolvedValue(actor);
    enforceRateLimit.mockResolvedValue(null);
    startVerification.mockResolvedValue({ url: "https://verify.didit.test/session" });
  });

  it("uses only the exact workspace verification proof and returns minimal hosted links", async () => {
    const response = await POST(request({ birthDate: "1985-05-12", consent: true }), context);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      url: "https://verify.didit.test/session",
      managementUrl: expect.stringContaining("/verify/"),
    });
    expect(startVerification).toHaveBeenCalledWith(expect.objectContaining({
      workspaceRef,
      birthDate: "1985-05-12",
      proofHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    }));
    expect(response.headers.get("set-cookie")).toContain("nakshatra_brokerdesk_proof=;");
    expect(JSON.stringify(startVerification.mock.calls)).not.toContain("organizationId");
  });

  it("rejects missing or substituted action proofs and caller-expanded input", async () => {
    const wrong = createBrokerdeskProofCookie({
      challengeId: "22222222-2222-4222-8222-222222222222",
      workspaceRef,
      purpose: "team_invite",
      proof: "p".repeat(43),
    });
    expect((await POST(request({ birthDate: "1985-05-12", consent: true }, wrong), context)).status).toBe(403);
    expect((await POST(request({ birthDate: "1985-05-12", consent: true, organizationId: "private" }), context)).status).toBe(400);
  });

  it("fails closed for invalid consent, cross-origin requests, missing sessions, and throttling", async () => {
    expect((await POST(request({ birthDate: "1985-05-12", consent: false }), context)).status).toBe(400);
    expect((await POST(request({ birthDate: "1985-05-12", consent: true }, undefined, "https://attacker.test"), context)).status).toBe(403);
    getApiUser.mockResolvedValueOnce({ status: "missing_session" });
    expect((await POST(request({ birthDate: "1985-05-12", consent: true }), context)).status).toBe(401);
    enforceRateLimit.mockResolvedValueOnce(new Response("limited", { status: 429 }));
    expect((await POST(request({ birthDate: "1985-05-12", consent: true }), context)).status).toBe(429);
  });

  it("returns the consent-management link and consumes the browser proof after provider failure", async () => {
    startVerification.mockRejectedValueOnce(new IdentityVerificationSessionError(
      "Identity verification is temporarily unavailable. Please try again.",
      "IDENTITY_VERIFICATION_PROVIDER_UNAVAILABLE",
      503,
      "private-management-token"
    ));
    const response = await POST(request({ birthDate: "1985-05-12", consent: true }), context);
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      code: "IDENTITY_VERIFICATION_PROVIDER_UNAVAILABLE",
      managementUrl: expect.stringContaining("/verify/private-management-token"),
    });
    expect(response.headers.get("set-cookie")).toContain("nakshatra_brokerdesk_proof=;");
  });
});
