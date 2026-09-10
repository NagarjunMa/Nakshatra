import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { workspaceRefSchema } from "@/features/security/public-reference";
import {
  brokerdeskAccessSchema,
  type BrokerDeskAccess,
} from "./organization-access.contract";
import { OrganizationAccessRepository } from "./organization-access.repository";
import { brokerdeskTeamResultSchema, type BrokerdeskTeamResult } from "./brokerdesk-team.contract";

const DISABLED_ACCESS: BrokerDeskAccess = { enabled: false };

export class OrganizationAccessError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number
  ) {
    super(message);
  }
}

/**
 * Resolves the current member's safe BrokerDesk access envelope. Malformed,
 * absent, disabled, and cross-tenant workspace references share one result.
 */
export async function resolveBrokerDeskAccess(
  supabase: SupabaseClient,
  workspaceRef: string
): Promise<BrokerDeskAccess> {
  const parsedReference = workspaceRefSchema.safeParse(workspaceRef);
  if (!parsedReference.success) return DISABLED_ACCESS;

  const { data, error } = await new OrganizationAccessRepository(
    supabase
  ).resolveBrokerDeskAccess(parsedReference.data);
  const parsedAccess = brokerdeskAccessSchema.safeParse(data);

  if (error || !parsedAccess.success) {
    throw new OrganizationAccessError(
      "BrokerDesk access is temporarily unavailable.",
      "BROKERDESK_ACCESS_UNAVAILABLE",
      503
    );
  }

  return parsedAccess.data;
}

/** Returns the minimal owner/admin team projection without exposing internal user or membership IDs. */
export async function resolveBrokerDeskTeam(
  supabase: SupabaseClient,
  workspaceRef: string
): Promise<BrokerdeskTeamResult> {
  const parsedReference = workspaceRefSchema.safeParse(workspaceRef);
  if (!parsedReference.success) return { available: false };

  const { data, error } = await new OrganizationAccessRepository(supabase)
    .resolveBrokerDeskTeam(parsedReference.data);
  const parsed = brokerdeskTeamResultSchema.safeParse(data);
  if (error || !parsed.success) {
    throw new OrganizationAccessError(
      "Team access is temporarily unavailable.",
      "BROKERDESK_TEAM_UNAVAILABLE",
      503
    );
  }
  return parsed.data;
}
