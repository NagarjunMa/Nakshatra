import { z } from "zod/v4";
import { workspaceRefSchema } from "@/features/security/public-reference";

export const brokerdeskReauthPurposeSchema = z.enum([
  "team_invite",
  "team_access_replace",
  "team_suspend",
  "verification_manage",
]);

export const brokerdeskReauthStartSchema = z.object({
  status: z.literal("started"),
  challengeId: z.uuid(),
  workspaceRef: workspaceRefSchema,
  purpose: brokerdeskReauthPurposeSchema,
  expiresAt: z.string(),
}).strict();

export const brokerdeskReauthCompletionSchema = z.enum([
  "verified",
  "expired",
  "not_fresh",
  "not_authorized",
  "invalid",
]);

export type BrokerdeskReauthPurpose = z.infer<typeof brokerdeskReauthPurposeSchema>;
