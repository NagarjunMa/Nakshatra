import { describe, expect, it } from "vitest";
import {
  clearDeletionProofCookie,
  createDeletionProof,
  createDeletionProofCookie,
  createReauthTransactionCookie,
  hashDeletionProof,
  readDeletionProofCookie,
  readReauthTransactionCookie,
  readRequestCookie,
} from "../src/features/account/server/reauth-cookie";

const challengeId = "11111111-1111-4111-8111-111111111111";

describe("account deletion reauthentication cookies", () => {
  it("signs narrow HttpOnly cookies and rejects tampering", () => {
    const transaction = createReauthTransactionCookie(challengeId);
    expect(transaction).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/api/auth/callback", maxAge: 600 });
    expect(readReauthTransactionCookie(transaction.value)).toEqual({ version: 1, challengeId });
    expect(readReauthTransactionCookie(`${transaction.value}x`)).toBeNull();
  });

  it("creates one-time proof material that only the server can validate", () => {
    const proof = createDeletionProof();
    expect(proof).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(hashDeletionProof(proof)).toMatch(/^[a-f0-9]{64}$/);
    const cookie = createDeletionProofCookie(challengeId, proof);
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/api/account/deletion", maxAge: 600 });
    expect(readDeletionProofCookie(cookie.value)).toEqual({ version: 1, challengeId, proof });
    expect(readDeletionProofCookie(undefined)).toBeNull();
    expect(clearDeletionProofCookie()).toMatchObject({ name: cookie.name, value: "", maxAge: 0 });
  });

  it("extracts one named cookie without parsing unrelated request state", () => {
    const request = new Request("http://local", { headers: { Cookie: "other=value; proof=expected=value" } });
    expect(readRequestCookie(request, "proof")).toBe("expected=value");
    expect(readRequestCookie(request, "missing")).toBeUndefined();
  });
});
