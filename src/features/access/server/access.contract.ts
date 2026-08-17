import { z } from "zod/v4";

export const accessGrantSchema = z.object({
  id: z.string().uuid(),
  interestRequestId: z.string().uuid(),
  viewerName: z.string().nullable(),
  status: z.enum(["active", "expired", "revoked"]),
  expiresAt: z.string(),
  renewedAt: z.string().nullable().optional(),
  revokedAt: z.string().nullable().optional(),
  lastAccessedAt: z.string().nullable().optional(),
});

export const accessAuditEventSchema = z.object({
  id: z.number().int().nonnegative(),
  eventType: z.enum([
    "request_submitted",
    "request_reopened",
    "request_rejected",
    "grant_created",
    "grant_renewed",
    "grant_accessed",
    "grant_revoked",
    "grant_expired",
    "portfolio_rotated",
    "portfolio_unpublished",
  ]),
  viewerName: z.string().nullable().optional(),
  createdAt: z.string(),
  metadata: z.record(z.string(), z.unknown()),
});

export const portfolioAccessSummarySchema = z.object({
  grants: z.array(accessGrantSchema),
  events: z.array(accessAuditEventSchema),
});

export const grantActionSchema = z.object({
  action: z.enum(["renew", "revoke"]),
});

export const grantActionResultSchema = z.object({
  status: z.enum([
    "renewed",
    "revoked",
    "already_revoked",
    "invalid_transition",
    "not_found",
    "unauthorized",
  ]),
  expiresAt: z.string().optional(),
});

export type AccessGrant = z.infer<typeof accessGrantSchema>;
export type AccessAuditEvent = z.infer<typeof accessAuditEventSchema>;
export type PortfolioAccessSummary = z.infer<typeof portfolioAccessSummarySchema>;
export type GrantAction = z.infer<typeof grantActionSchema>["action"];
