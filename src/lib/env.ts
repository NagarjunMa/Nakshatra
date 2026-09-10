import { z } from "zod/v4";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required"),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});

const deletionReauthSecretSchema = z
  .string()
  .min(32, "DELETION_REAUTH_COOKIE_SECRET must contain at least 32 characters");

const brokerdeskReauthSecretSchema = z
  .string()
  .min(32, "BROKERDESK_REAUTH_COOKIE_SECRET must contain at least 32 characters");

const brokerdeskInvitationSecretSchema = z
  .string()
  .min(32, "BROKERDESK_INVITATION_TOKEN_SECRET must contain at least 32 characters");

/** Reads the server-only HMAC key only in deletion-reauthentication code paths. */
export function getDeletionReauthCookieSecret() {
  return deletionReauthSecretSchema.parse(process.env.DELETION_REAUTH_COOKIE_SECRET);
}

/** Reads the independent HMAC key used only for BrokerDesk privileged-action proofs. */
export function getBrokerdeskReauthCookieSecret() {
  if (!process.env.BROKERDESK_REAUTH_COOKIE_SECRET && process.env.NODE_ENV === "test") {
    return "test-only-brokerdesk-reauth-cookie-secret-at-least-32-chars";
  }
  return brokerdeskReauthSecretSchema.parse(process.env.BROKERDESK_REAUTH_COOKIE_SECRET);
}

/** Reads the independent key used only for team-invitation tokens and exchange cookies. */
export function getBrokerdeskInvitationTokenSecret() {
  if (!process.env.BROKERDESK_INVITATION_TOKEN_SECRET && process.env.NODE_ENV === "test") {
    return "test-only-brokerdesk-invitation-token-secret-at-least-32-chars";
  }
  return brokerdeskInvitationSecretSchema.parse(process.env.BROKERDESK_INVITATION_TOKEN_SECRET);
}
