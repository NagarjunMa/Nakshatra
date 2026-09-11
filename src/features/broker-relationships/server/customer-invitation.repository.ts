import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export class CustomerInvitationRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  create(input: {
    workspaceRef: string;
    emailHash: string;
    emailHint: string;
    tokenHash: string;
    idempotencyKey: string;
  }) {
    return this.supabase.rpc("create_brokerdesk_customer_invitation", {
      p_workspace_ref: input.workspaceRef,
      p_email_hash: input.emailHash,
      p_email_hint: input.emailHint,
      p_token_hash: input.tokenHash,
      p_idempotency_key: input.idempotencyKey,
    });
  }

  claim(tokenHash: string) {
    return this.supabase.rpc("claim_brokerdesk_customer_invitation", { p_token_hash: tokenHash });
  }

  brokerdeskCustomers(workspaceRef: string) {
    return this.supabase.rpc("resolve_brokerdesk_customers", { p_workspace_ref: workspaceRef });
  }

  brokerdeskCustomer(workspaceRef: string, relationshipRef: string) {
    return this.supabase.rpc("resolve_brokerdesk_customer", {
      p_workspace_ref: workspaceRef,
      p_relationship_ref: relationshipRef,
    });
  }

  customerRelationships() {
    return this.supabase.rpc("resolve_customer_broker_relationships");
  }
}
