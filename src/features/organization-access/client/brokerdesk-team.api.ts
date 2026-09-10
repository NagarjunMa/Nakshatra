import type { InvitedRolePreset } from "@/features/organization-access/server/brokerdesk-team-invitation.contract";

async function command<T>(url: string, body: object): Promise<T> {
  const response = await fetch(url, {
    method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => null) as (T & { error?: string }) | null;
  if (!response.ok || !result) throw new Error(result?.error || "This action is temporarily unavailable.");
  return result;
}

export function startTeamInvitationSecurity(workspaceRef: string, method: "google" | "email") {
  return command<{ url?: string; sent?: boolean }>(
    `/api/v1/brokerdesk/workspaces/${encodeURIComponent(workspaceRef)}/reauth/start`,
    { method, purpose: "team_invite" }
  );
}

export function inviteTeamMember(workspaceRef: string, email: string, rolePreset: InvitedRolePreset, idempotencyKey: string) {
  return command<{ invitationUrl: string; emailHint: string; expiresAt: string }>(
    `/api/v1/brokerdesk/workspaces/${encodeURIComponent(workspaceRef)}/team-invitations`,
    { email, rolePreset, idempotencyKey }
  );
}
