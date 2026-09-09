import { z } from "zod/v4";
import { workspaceRefSchema } from "@/features/security/public-reference";

export const brokerdeskCapabilitySchema = z.enum([
  "customers.read",
  "customers.invite",
  "customers.edit_relationship",
  "portfolio.review",
  "portfolio.edit_as_delegate",
  "introductions.create",
  "introductions.send",
  "introductions.record_response",
  "introductions.close",
  "tasks.manage",
  "renewals.manage",
  "team.invite",
  "team.assign",
  "settings.manage",
  "verification.manage",
]);

export const brokerdeskResourceScopeSchema = z.enum([
  "organization",
  "assigned_customers",
  "assigned_team",
  "explicit_resource",
]);

export const brokerdeskRolePresetSchema = z.enum([
  "owner",
  "admin",
  "advisor",
  "coordinator",
  "viewer",
]);

const disabledAccessSchema = z.object({ enabled: z.literal(false) }).strict();
const enabledAccessSchema = z.object({
  enabled: z.literal(true),
  workspaceRef: workspaceRefSchema,
  rolePreset: brokerdeskRolePresetSchema,
  capabilities: z.array(z.object({
    key: brokerdeskCapabilitySchema,
    scope: brokerdeskResourceScopeSchema,
  }).strict()),
}).strict();

export const brokerdeskAccessSchema = z.discriminatedUnion("enabled", [
  disabledAccessSchema,
  enabledAccessSchema,
]);

export type BrokerDeskAccess = z.infer<typeof brokerdeskAccessSchema>;
