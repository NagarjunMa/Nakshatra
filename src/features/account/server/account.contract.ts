import { z } from "zod/v4";

export const deletionRequestSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("pending"), scheduledFor: z.string() }),
  z.object({ status: z.literal("ownership_transfer_required"), organizationCount: z.number().int().positive() }),
  z.object({ status: z.literal("processing") }),
  z.object({ status: z.literal("completed") }),
  z.object({ status: z.literal("unavailable") }),
]);

export const deletionReauthStartSchema = z.object({
  status: z.literal("started"),
  challengeId: z.uuid(),
  expiresAt: z.string(),
});

export const deletionReauthCompletionSchema = z.enum(["verified", "expired", "not_fresh", "invalid"]);

export const deletionReauthConsumptionSchema = z.union([
  deletionRequestSchema,
  z.object({ status: z.literal("proof_invalid") }),
  z.object({ status: z.literal("proof_expired") }),
]);

export const deletionStatusSchema = z.object({
  status: z.enum(["pending", "processing", "completed", "failed", "canceled"]),
  scheduledFor: z.string(),
  requestedAt: z.string(),
}).nullable();

export type AccountDeletionStatus = z.infer<typeof deletionStatusSchema>;
