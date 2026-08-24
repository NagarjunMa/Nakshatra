import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getDeletionReauthCookieSecret } from "@/lib/env";

const TRANSACTION_COOKIE = "nakshatra_deletion_reauth";
const PROOF_COOKIE = "nakshatra_deletion_proof";
const MAX_AGE_SECONDS = 10 * 60;

type TransactionPayload = { version: 1; challengeId: string };
type ProofPayload = TransactionPayload & { proof: string };

function isUuid(value: unknown): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function sign(encodedPayload: string) {
  return createHmac("sha256", getDeletionReauthCookieSecret()).update(encodedPayload).digest("base64url");
}

function encode(payload: TransactionPayload | ProofPayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

function decode(value: string | undefined): unknown {
  if (!value) return null;
  const [encodedPayload, signature, ...extra] = value.split(".");
  if (!encodedPayload || !signature || extra.length > 0) return null;
  const expected = Buffer.from(sign(encodedPayload));
  const supplied = Buffer.from(signature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  try {
    return JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as unknown;
  } catch {
    return null;
  }
}

function cookieOptions(path: string) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path,
    maxAge: MAX_AGE_SECONDS,
    priority: "high" as const,
  };
}

export function createReauthTransactionCookie(challengeId: string) {
  return {
    name: TRANSACTION_COOKIE,
    value: encode({ version: 1, challengeId }),
    ...cookieOptions("/api/auth/callback"),
  };
}

export function readReauthTransactionCookie(value: string | undefined): TransactionPayload | null {
  const payload = decode(value);
  if (!payload || typeof payload !== "object") return null;
  const candidate = payload as Partial<TransactionPayload>;
  return candidate.version === 1 && isUuid(candidate.challengeId)
    ? { version: 1, challengeId: candidate.challengeId }
    : null;
}

export function createDeletionProof() {
  return randomBytes(32).toString("base64url");
}

export function hashDeletionProof(proof: string) {
  return createHash("sha256").update(proof).digest("hex");
}

export function createDeletionProofCookie(challengeId: string, proof: string) {
  return {
    name: PROOF_COOKIE,
    value: encode({ version: 1, challengeId, proof }),
    ...cookieOptions("/api/account/deletion"),
  };
}

export function readDeletionProofCookie(value: string | undefined): ProofPayload | null {
  const payload = decode(value);
  if (!payload || typeof payload !== "object") return null;
  const candidate = payload as Partial<ProofPayload>;
  return candidate.version === 1 && isUuid(candidate.challengeId)
    && typeof candidate.proof === "string" && /^[A-Za-z0-9_-]{43}$/.test(candidate.proof)
    ? { version: 1, challengeId: candidate.challengeId, proof: candidate.proof }
    : null;
}

export function clearReauthTransactionCookie() {
  return { name: TRANSACTION_COOKIE, value: "", ...cookieOptions("/api/auth/callback"), maxAge: 0 };
}

export function clearDeletionProofCookie() {
  return { name: PROOF_COOKIE, value: "", ...cookieOptions("/api/account/deletion"), maxAge: 0 };
}

/** Reads one cookie without relying on global request state. */
export function readRequestCookie(request: Request, name: string) {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return undefined;
}

export const deletionReauthCookieNames = { transaction: TRANSACTION_COOKIE, proof: PROOF_COOKIE } as const;
