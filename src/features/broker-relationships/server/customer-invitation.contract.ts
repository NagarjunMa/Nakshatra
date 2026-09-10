import { z } from "zod/v4";
import {
  brokerCustomerRelationshipRefSchema,
  invitationRefSchema,
  workspaceRefSchema,
} from "@/features/security/public-reference";
import { idempotencyKeySchema } from "@/features/organization-access/server/brokerdesk-team-invitation.contract";

export const createCustomerInvitationCommandSchema = z.object({
  email: z.email().max(254),
  idempotencyKey: idempotencyKeySchema,
}).strict();

export const createdCustomerInvitationSchema = z.object({
  status: z.literal("created"),
  invitationRef: invitationRefSchema,
  workspaceRef: workspaceRefSchema,
  emailHint: z.string().min(5).max(254),
  expiresAt: z.string(),
}).strict();

export const claimedCustomerInvitationSchema = z.discriminatedUnion("available", [
  z.object({ available: z.literal(false) }).strict(),
  z.object({
    available: z.literal(true),
    status: z.enum(["portfolio_required", "active"]),
    invitationRef: invitationRefSchema,
    workspaceName: z.string().min(1).max(180),
    relationshipRef: brokerCustomerRelationshipRefSchema.nullable(),
    relationshipEndsAt: z.string(),
  }).strict(),
]);

const relationshipItemSchema = z.object({
  kind: z.literal("relationship"),
  relationshipRef: brokerCustomerRelationshipRefSchema,
  displayName: z.string().min(1).max(180),
  gender: z.string().max(80).nullable(),
  relationshipStatus: z.enum(["active", "paused", "expired", "terminated"]),
  portfolioStatus: z.enum(["published", "completing"]),
  startsAt: z.string(),
  endsAt: z.string().nullable(),
}).strict();

const invitationItemSchema = z.object({
  kind: z.literal("invitation"),
  invitationRef: invitationRefSchema,
  emailHint: z.string().min(5).max(254),
  invitationStatus: z.enum(["invited", "portfolio_required", "expired", "revoked", "active"]),
  expiresAt: z.string(),
}).strict();

export const brokerdeskCustomersSchema = z.discriminatedUnion("available", [
  z.object({ available: z.literal(false) }).strict(),
  z.object({
    available: z.literal(true),
    workspaceRef: workspaceRefSchema,
    customers: z.array(z.discriminatedUnion("kind", [relationshipItemSchema, invitationItemSchema])).max(200),
  }).strict(),
]);

export const customerBrokerRelationshipsSchema = z.object({
  available: z.literal(true),
  relationships: z.array(z.object({
    relationshipRef: brokerCustomerRelationshipRefSchema,
    workspaceName: z.string().min(1).max(180),
    relationshipStatus: z.enum(["active", "paused", "expired", "terminated"]),
    startsAt: z.string(),
    endsAt: z.string().nullable(),
  }).strict()).max(100),
}).strict();

export type BrokerdeskCustomers = z.infer<typeof brokerdeskCustomersSchema>;
export type CustomerBrokerRelationships = z.infer<typeof customerBrokerRelationshipsSchema>;
