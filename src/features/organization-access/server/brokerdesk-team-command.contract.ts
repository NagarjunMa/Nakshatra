import { z } from "zod/v4";
import { memberRefSchema, workspaceRefSchema } from "@/features/security/public-reference";
import { brokerdeskRolePresetSchema } from "./organization-access.contract";
import { idempotencyKeySchema } from "./brokerdesk-team-invitation.contract";

export const mutableTeamRolePresetSchema = brokerdeskRolePresetSchema.exclude(["owner"]);

export const replaceTeamMemberAccessCommandSchema = z.object({
  rolePreset: mutableTeamRolePresetSchema,
  idempotencyKey: idempotencyKeySchema,
}).strict();

export const suspendTeamMemberCommandSchema = z.object({
  idempotencyKey: idempotencyKeySchema,
}).strict();

export const replacedTeamMemberAccessSchema = z.object({
  status: z.literal("updated"),
  workspaceRef: workspaceRefSchema,
  memberRef: memberRefSchema,
  rolePreset: mutableTeamRolePresetSchema,
  customerAccess: z.enum(["all_customers", "assigned_customers", "none"]),
  assignedCustomerCount: z.number().int().nonnegative(),
}).strict();

export const suspendedTeamMemberSchema = z.object({
  status: z.literal("suspended"),
  workspaceRef: workspaceRefSchema,
  memberRef: memberRefSchema,
}).strict();

export type MutableTeamRolePreset = z.infer<typeof mutableTeamRolePresetSchema>;
