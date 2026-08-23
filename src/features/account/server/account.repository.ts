import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/** Keeps account privacy queries behind one server-only data-access boundary. */
export class AccountRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  exportAccount() {
    return this.supabase.rpc("export_my_account_data");
  }

  requestDeletion() {
    return this.supabase.rpc("request_account_deletion");
  }

  cancelDeletion() {
    return this.supabase.rpc("cancel_account_deletion");
  }

  getDeletionStatus() {
    return this.supabase
      .from("account_deletion_requests")
      .select("status, scheduled_for, requested_at")
      .maybeSingle();
  }
}
