import type { BrokerdeskReauthPurpose } from "@/features/organization-access/server/brokerdesk-reauth.contract";

type SecurityStartResult = { url?: string; sent?: boolean };

/** Starts a purpose-bound BrokerDesk security check without trusting a client-selected destination. */
export async function startBrokerdeskActionSecurity(
  workspaceRef: string,
  method: "google" | "email",
  purpose: BrokerdeskReauthPurpose
): Promise<SecurityStartResult> {
  const response = await fetch(
    `/api/v1/brokerdesk/workspaces/${encodeURIComponent(workspaceRef)}/reauth/start`,
    {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method, purpose }),
    }
  );
  const result = await response.json().catch(() => null) as (SecurityStartResult & { error?: string }) | null;
  if (!response.ok || !result) {
    throw new Error(result?.error || "The security check is temporarily unavailable.");
  }
  return result;
}
