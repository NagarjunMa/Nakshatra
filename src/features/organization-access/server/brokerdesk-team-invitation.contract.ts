import { z } from "zod/v4";
import { invitationRefSchema, workspaceRefSchema } from "@/features/security/public-reference";
import { brokerdeskRolePresetSchema } from "./organization-access.contract";

export const invitedRolePresetSchema = brokerdeskRolePresetSchema.exclude(["owner"]);
export const idempotencyKeySchema = z.string().min(16).max(128).regex(/^[A-Za-z0-9_.:-]+$/);

export const createTeamInvitationCommandSchema = z.object({
  email: z.email().max(254),
  rolePreset: invitedRolePresetSchema,
  idempotencyKey: idempotencyKeySchema,
}).strict();

export const createdTeamInvitationSchema = z.object({
  status: z.literal("created"),
  invitationRef: invitationRefSchema,
  workspaceRef: workspaceRefSchema,
  emailHint: z.string().min(5).max(254),
  rolePreset: invitedRolePresetSchema,
  expiresAt: z.string(),
}).strict();

export const acceptedTeamInvitationSchema = z.discriminatedUnion("available", [
  z.object({ available: z.literal(false) }).strict(),
  z.object({
    available: z.literal(true),
    workspaceRef: workspaceRefSchema,
    workspaceName: z.string().min(1).max(180),
    rolePreset: invitedRolePresetSchema,
    memberRef: z.string().regex(/^mbr_[0-9a-f]{32}$/),
  }).strict(),
]);

export type InvitedRolePreset = z.infer<typeof invitedRolePresetSchema>;
