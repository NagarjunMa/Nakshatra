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

/** Reads the server-only HMAC key only in deletion-reauthentication code paths. */
export function getDeletionReauthCookieSecret() {
  return deletionReauthSecretSchema.parse(process.env.DELETION_REAUTH_COOKIE_SECRET);
}
