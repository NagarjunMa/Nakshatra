import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { brokerdeskReauthPurposeSchema, type BrokerdeskReauthPurpose } from "./brokerdesk-reauth.contract";
import { workspaceRefSchema } from "@/features/security/public-reference";
import { getBrokerdeskReauthCookieSecret } from "@/lib/env";

const TRANSACTION_COOKIE = "nakshatra_brokerdesk_reauth";
const PROOF_COOKIE = "nakshatra_brokerdesk_proof";
const MAX_AGE_SECONDS = 10 * 60;

type TransactionPayload = {
  version: 1;
  challengeId: string;
  workspaceRef: string;
  purpose: BrokerdeskReauthPurpose;
};
type ProofPayload = TransactionPayload & { proof: string };

function isUuid(value: unknown): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function sign(encodedPayload: string) {
  return createHmac("sha256", getBrokerdeskReauthCookieSecret())
    .update(`brokerdesk-action-reauth.v1.${encodedPayload}`)
    .digest("base64url");
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

function parseTransaction(value: unknown): TransactionPayload | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<TransactionPayload>;
  const workspace = workspaceRefSchema.safeParse(candidate.workspaceRef);
  const purpose = brokerdeskReauthPurposeSchema.safeParse(candidate.purpose);
  if (candidate.version !== 1 || !isUuid(candidate.challengeId) || !workspace.success || !purpose.success) return null;
  return {
    version: 1,
    challengeId: candidate.challengeId,
    workspaceRef: workspace.data,
    purpose: purpose.data,
  };
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

export function createBrokerdeskReauthTransactionCookie(payload: Omit<TransactionPayload, "version">) {
  return {
    name: TRANSACTION_COOKIE,
    value: encode({ version: 1, ...payload }),
    ...cookieOptions("/api/auth/callback"),
  };
}

export function readBrokerdeskReauthTransactionCookie(value: string | undefined) {
  return parseTransaction(decode(value));
}

export function createBrokerdeskProof() {
  return randomBytes(32).toString("base64url");
}

export function hashBrokerdeskProof(proof: string) {
  return createHash("sha256").update(proof).digest("hex");
}

export function createBrokerdeskProofCookie(payload: Omit<ProofPayload, "version">) {
  return {
    name: PROOF_COOKIE,
    value: encode({ version: 1, ...payload }),
    ...cookieOptions(`/api/v1/brokerdesk/workspaces/${payload.workspaceRef}`),
  };
}

export function readBrokerdeskProofCookie(value: string | undefined): ProofPayload | null {
  const decoded = decode(value);
  const transaction = parseTransaction(decoded);
  if (!transaction || !decoded || typeof decoded !== "object") return null;
  const proof = (decoded as Partial<ProofPayload>).proof;
  return typeof proof === "string" && /^[A-Za-z0-9_-]{43}$/.test(proof)
    ? { ...transaction, proof }
    : null;
}

export function clearBrokerdeskReauthTransactionCookie() {
  return { name: TRANSACTION_COOKIE, value: "", ...cookieOptions("/api/auth/callback"), maxAge: 0 };
}

export function clearBrokerdeskProofCookie(workspaceRef: string) {
  return {
    name: PROOF_COOKIE,
    value: "",
    ...cookieOptions(`/api/v1/brokerdesk/workspaces/${workspaceRef}`),
    maxAge: 0,
  };
}

export const brokerdeskReauthCookieNames = { transaction: TRANSACTION_COOKIE, proof: PROOF_COOKIE } as const;
