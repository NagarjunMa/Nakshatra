import { z } from "zod/v4";
import { brokerdeskRolePresetSchema } from "./organization-access.contract";
import { memberRefSchema, workspaceRefSchema } from "@/features/security/public-reference";

export const brokerdeskTeamMemberSchema = z.object({
  memberRef: memberRefSchema,
  displayName: z.string().min(1).max(180),
  email: z.email().max(254).nullable(),
  rolePreset: brokerdeskRolePresetSchema,
  status: z.enum(["invited", "active", "suspended", "removed"]),
  customerAccess: z.enum(["all_customers", "assigned_customers", "none"]),
  assignedCustomerCount: z.number().int().nonnegative(),
  joinedAt: z.string(),
  isCurrentUser: z.boolean(),
}).strict();

export const brokerdeskTeamSchema = z.object({
  available: z.literal(true),
  workspaceRef: workspaceRefSchema,
  members: z.array(brokerdeskTeamMemberSchema),
}).strict();

export const brokerdeskTeamResultSchema = z.discriminatedUnion("available", [
  z.object({ available: z.literal(false) }).strict(),
  brokerdeskTeamSchema,
]);

export type BrokerdeskTeamResult = z.infer<typeof brokerdeskTeamResultSchema>;
