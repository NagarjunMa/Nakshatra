import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { getBrokerdeskInvitationTokenSecret } from "@/lib/env";
import { isTeamInvitationToken } from "./brokerdesk-team-invitation.token";

const COOKIE = "nakshatra_team_invitation";
const PATH = "/api/v1/brokerdesk/team-invitations/accept";

function signature(token: string) {
  return createHmac("sha256", getBrokerdeskInvitationTokenSecret())
    .update(`brokerdesk-team-invitation-cookie.v1.${token}`)
    .digest("base64url");
}

export function createTeamInvitationExchangeCookie(token: string) {
  if (!isTeamInvitationToken(token)) throw new Error("BROKERDESK_INVITATION_TOKEN_INVALID");
  return {
    name: COOKIE,
    value: `${token}.${signature(token)}`,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: PATH,
    maxAge: 15 * 60,
    priority: "high" as const,
  };
}

export function readTeamInvitationExchangeCookie(value: string | undefined) {
  if (!value) return null;
  const [token, supplied, ...extra] = value.split(".");
  if (!isTeamInvitationToken(token) || !/^[A-Za-z0-9_-]{43}$/.test(supplied || "") || extra.length) return null;
  const expectedBytes = Buffer.from(signature(token));
  const suppliedBytes = Buffer.from(supplied);
  return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes)
    ? token
    : null;
}

export function clearTeamInvitationExchangeCookie() {
  return { ...createTeamInvitationExchangeCookie("a".repeat(43)), value: "", maxAge: 0 };
}

export const teamInvitationCookieName = COOKIE;
