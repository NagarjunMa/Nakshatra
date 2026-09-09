import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/** Keeps BrokerDesk authorization resolution behind a server-only boundary. */
export class OrganizationAccessRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  resolveBrokerDeskAccess(workspaceRef: string) {
    return this.supabase.rpc("resolve_brokerdesk_access", {
      p_workspace_ref: workspaceRef,
    });
  }

  resolveBrokerDeskTeam(workspaceRef: string) {
    return this.supabase.rpc("resolve_brokerdesk_team", {
      p_workspace_ref: workspaceRef,
    });
  }
}
