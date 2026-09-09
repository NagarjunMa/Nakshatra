import { describe, expect, it } from "vitest";
import {
  brokerdeskReauthCookieNames,
  clearBrokerdeskProofCookie,
  clearBrokerdeskReauthTransactionCookie,
  createBrokerdeskProof,
  createBrokerdeskProofCookie,
  createBrokerdeskReauthTransactionCookie,
  hashBrokerdeskProof,
  readBrokerdeskProofCookie,
  readBrokerdeskReauthTransactionCookie,
} from "@/features/organization-access/server/brokerdesk-reauth-cookie";

const challengeId = "11111111-1111-4111-8111-111111111111";
const workspaceRef = `wrk_${"a".repeat(32)}`;

describe("BrokerDesk privileged reauthentication cookies", () => {
  it("binds a signed transaction to one workspace and action", () => {
    const cookie = createBrokerdeskReauthTransactionCookie({
      challengeId,
      workspaceRef,
      purpose: "team_invite",
    });

    expect(cookie).toMatchObject({
      name: brokerdeskReauthCookieNames.transaction,
      httpOnly: true,
      sameSite: "lax",
      path: "/api/auth/callback",
      maxAge: 600,
    });
    expect(readBrokerdeskReauthTransactionCookie(cookie.value)).toEqual({
      version: 1,
      challengeId,
      workspaceRef,
      purpose: "team_invite",
    });
    expect(readBrokerdeskReauthTransactionCookie(`${cookie.value}x`)).toBeNull();
    expect(clearBrokerdeskReauthTransactionCookie()).toMatchObject({
      name: cookie.name,
      value: "",
      maxAge: 0,
    });
  });

  it("scopes the one-time proof cookie to the exact workspace API", () => {
    const proof = createBrokerdeskProof();
    expect(proof).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(hashBrokerdeskProof(proof)).toMatch(/^[a-f0-9]{64}$/);

    const cookie = createBrokerdeskProofCookie({
      challengeId,
      workspaceRef,
      purpose: "team_access_replace",
      proof,
    });
    expect(cookie).toMatchObject({
      name: brokerdeskReauthCookieNames.proof,
      httpOnly: true,
      path: `/api/v1/brokerdesk/workspaces/${workspaceRef}`,
      maxAge: 600,
    });
    expect(readBrokerdeskProofCookie(cookie.value)).toEqual({
      version: 1,
      challengeId,
      workspaceRef,
      purpose: "team_access_replace",
      proof,
    });
    expect(clearBrokerdeskProofCookie(workspaceRef)).toMatchObject({
      name: cookie.name,
      value: "",
      maxAge: 0,
    });
  });

  it("rejects malformed and tampered values", () => {
    expect(readBrokerdeskReauthTransactionCookie(undefined)).toBeNull();
    expect(readBrokerdeskReauthTransactionCookie("invalid.value")).toBeNull();
    expect(readBrokerdeskProofCookie(undefined)).toBeNull();
  });
});
