import { beforeEach, describe, expect, it, vi } from "vitest";

const getApiUser = vi.hoisted(() => vi.fn());
const createClient = vi.hoisted(() => vi.fn());
const enforceRateLimit = vi.hoisted(() => vi.fn());
const createInvitation = vi.hoisted(() => vi.fn());
const startVerification = vi.hoisted(() => vi.fn());
const retryVerification = vi.hoisted(() => vi.fn());
const getLinkStatus = vi.hoisted(() => vi.fn());
const withdrawConsent = vi.hoisted(() => vi.fn());
const createToken = vi.hoisted(() => vi.fn());
const hashToken = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ getApiUser }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/features/security/server/rate-limit.service", () => ({ enforceRateLimit }));
vi.mock("@/features/identity-verification/server/invitation.service", () => ({
  createIdentityVerificationInvitation: createInvitation,
  IdentityVerificationInvitationError: class IdentityVerificationInvitationError extends Error {
    constructor(message: string, readonly code: string, readonly status: number) { super(message); }
  },
}));
vi.mock("@/features/identity-verification/server/session.service", () => ({
  startIdentityVerification: startVerification,
  retryIdentityVerification: retryVerification,
  getIdentityVerificationLinkStatus: getLinkStatus,
  withdrawIdentityVerificationConsent: withdrawConsent,
  IdentityVerificationSessionError: class IdentityVerificationSessionError extends Error {
    constructor(message: string, readonly code: string, readonly status: number, readonly managementToken?: string) { super(message); }
  },
}));
vi.mock("@/features/identity-verification/server/identity-verification.tokens", () => ({
  createIdentityVerificationToken: createToken,
  hashIdentityVerificationToken: hashToken,
  isIdentityVerificationToken: (value: string) => value === "valid-token",
}));

import { POST as createInvitationRoute } from "../src/app/api/identity-verification/invitations/route";
import { POST as startRoute } from "../src/app/api/identity-verification/start/route";
import { DELETE as withdrawRoute, POST as statusRoute } from "../src/app/api/identity-verification/status/route";
import { POST as retryRoute } from "../src/app/api/identity-verification/retry/route";

const supabase = { rpc: vi.fn() };
const authenticated = { status: "authenticated" as const, user: { id: "actor", sessionId: "session" }, supabase };

function request(url: string, body: unknown, origin = "http://local") {
  return new Request(url, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

describe("identity-verification API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getApiUser.mockResolvedValue(authenticated);
    createClient.mockResolvedValue(supabase);
    enforceRateLimit.mockResolvedValue(null);
    createToken.mockReturnValue("generated-token");
    hashToken.mockImplementation(async (token: string) => `${token}-hash`);
    createInvitation.mockResolvedValue({ expiresAt: "2026-09-01T00:00:00.000Z" });
    startVerification.mockResolvedValue({ url: "https://verify.didit.test/session" });
    retryVerification.mockResolvedValue({ url: "https://verify.didit.test/retry" });
    getLinkStatus.mockResolvedValue({ kind: "invitation", status: "ready" });
    withdrawConsent.mockResolvedValue(undefined);
  });

  it("creates an owner-authorized invitation with a no-store opaque URL", async () => {
    const response = await createInvitationRoute(request("http://local/api/identity-verification/invitations", { candidateId: "11111111-1111-4111-8111-111111111111" }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ invitationUrl: "http://local/verify/generated-token", expiresAt: "2026-09-01T00:00:00.000Z" });
    expect(createInvitation).toHaveBeenCalledWith(expect.objectContaining({ candidateId: "11111111-1111-4111-8111-111111111111", tokenHash: "generated-token-hash" }));
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("rejects cross-site, unauthenticated, rate-limited, and malformed invitation requests", async () => {
    expect((await createInvitationRoute(request("http://local/api/identity-verification/invitations", {}, "https://attacker.test"))).status).toBe(403);
    getApiUser.mockResolvedValueOnce({ status: "missing_session" });
    expect((await createInvitationRoute(request("http://local/api/identity-verification/invitations", {}))).status).toBe(401);
    enforceRateLimit.mockResolvedValueOnce(new Response(null, { status: 429 }));
    expect((await createInvitationRoute(request("http://local/api/identity-verification/invitations", { candidateId: "11111111-1111-4111-8111-111111111111" }))).status).toBe(429);
    expect((await createInvitationRoute(request("http://local/api/identity-verification/invitations", {}))).status).toBe(400);
  });

  it("starts an invitation verification only after explicit consent and never serializes PII", async () => {
    const response = await startRoute(request("http://local/api/identity-verification/start", { authorization: "invitation", token: "valid-token", consent: true }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ url: "https://verify.didit.test/session", managementUrl: "http://local/verify/generated-token" });
    expect(startVerification).toHaveBeenCalledWith(expect.objectContaining({ candidateId: null, invitationTokenHash: "valid-token-hash", managementTokenHash: "generated-token-hash" }));
    expect(getApiUser).not.toHaveBeenCalled();
    expect(JSON.stringify(startVerification.mock.calls)).not.toContain("legalName");
    expect((await startRoute(request("http://local/api/identity-verification/start", { authorization: "invitation", token: "valid-token", consent: false }))).status).toBe(400);
  });

  it("uses authenticated primary-owner flow for self verification and fails closed for cross-site/rate-limited calls", async () => {
    const self = await startRoute(request("http://local/api/identity-verification/start", { authorization: "self", candidateId: "11111111-1111-4111-8111-111111111111", consent: true }));
    expect(self.status).toBe(200);
    expect(startVerification).toHaveBeenCalledWith(expect.objectContaining({ candidateId: "11111111-1111-4111-8111-111111111111", invitationTokenHash: null, supabase }));
    expect((await startRoute(request("http://local/api/identity-verification/start", { authorization: "self", candidateId: "11111111-1111-4111-8111-111111111111", consent: true }, "https://attacker.test"))).status).toBe(403);
    enforceRateLimit.mockResolvedValueOnce(new Response(null, { status: 429 }));
    expect((await startRoute(request("http://local/api/identity-verification/start", { authorization: "invitation", token: "valid-token", consent: true }))).status).toBe(429);
  });

  it("returns generic link state, supports one withdrawal, and protects both calls", async () => {
    const status = await statusRoute(request("http://local/api/identity-verification/status", { token: "valid-token" }));
    if (!status) throw new Error("Expected a status response");
    await expect(status.json()).resolves.toEqual({ link: { kind: "invitation", status: "ready" } });
    const withdraw = await withdrawRoute(new Request("http://local/api/identity-verification/status", { method: "DELETE", headers: { Origin: "http://local", "Content-Type": "application/json" }, body: JSON.stringify({ token: "valid-token" }) }));
    if (!withdraw) throw new Error("Expected a withdrawal response");
    await expect(withdraw.json()).resolves.toEqual({ withdrawn: true });
    expect(withdrawConsent).toHaveBeenCalledWith(supabase, "valid-token-hash");
    const invalid = await statusRoute(request("http://local/api/identity-verification/status", { token: "bad" }));
    expect(invalid?.status).toBe(400);
  });

  it("retries only from an opaque management token and returns a replacement link", async () => {
    const response = await retryRoute(request("http://local/api/identity-verification/retry", { token: "valid-token" }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ url: "https://verify.didit.test/retry", managementUrl: "http://local/verify/generated-token" });
    expect(retryVerification).toHaveBeenCalledWith(expect.objectContaining({ tokenHash: "valid-token-hash", managementTokenHash: "generated-token-hash" }));
  });
});
