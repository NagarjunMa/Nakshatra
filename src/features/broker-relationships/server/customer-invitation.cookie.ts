import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { getBrokerdeskInvitationTokenSecret } from "@/lib/env";
import { isCustomerInvitationToken } from "./customer-invitation.token";

const COOKIE = "nakshatra_customer_invitation";
const PATH = "/api/v1/customer/broker-invitations/claim";

function signature(token: string) {
  return createHmac("sha256", getBrokerdeskInvitationTokenSecret())
    .update(`brokerdesk-customer-invitation-cookie.v1.${token}`)
    .digest("base64url");
}

export function createCustomerInvitationExchangeCookie(token: string) {
  if (!isCustomerInvitationToken(token)) throw new Error("BROKERDESK_CUSTOMER_INVITATION_TOKEN_INVALID");
  return {
    name: COOKIE,
    value: `${token}.${signature(token)}`,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: PATH,
    maxAge: 30 * 60,
    priority: "high" as const,
  };
}

export function readCustomerInvitationExchangeCookie(value: string | undefined) {
  if (!value) return null;
  const [token, supplied, ...extra] = value.split(".");
  if (!isCustomerInvitationToken(token) || !/^[A-Za-z0-9_-]{43}$/.test(supplied || "") || extra.length) return null;
  const expectedBytes = Buffer.from(signature(token));
  const suppliedBytes = Buffer.from(supplied);
  return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes)
    ? token
    : null;
}

export function clearCustomerInvitationExchangeCookie() {
  return { ...createCustomerInvitationExchangeCookie("a".repeat(43)), value: "", maxAge: 0 };
}

export const customerInvitationCookieName = COOKIE;

