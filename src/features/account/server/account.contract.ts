import { z } from "zod/v4";

export const deletionRequestSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("pending"), scheduledFor: z.string() }),
  z.object({ status: z.literal("ownership_transfer_required"), organizationCount: z.number().int().positive() }),
]);

export const deletionStatusSchema = z.object({
  status: z.enum(["pending", "processing", "completed", "failed", "canceled"]),
  scheduledFor: z.string(),
  requestedAt: z.string(),
}).nullable();

export type AccountDeletionStatus = z.infer<typeof deletionStatusSchema>;
