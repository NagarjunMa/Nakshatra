import type { InvitedRolePreset } from "@/features/organization-access/server/brokerdesk-team-invitation.contract";
import type { BrokerdeskReauthPurpose } from "@/features/organization-access/server/brokerdesk-reauth.contract";
import type { MutableTeamRolePreset } from "@/features/organization-access/server/brokerdesk-team-command.contract";

async function command<T>(url: string, body: object, method = "POST"): Promise<T> {
  const response = await fetch(url, {
    method, credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => null) as (T & { error?: string }) | null;
  if (!response.ok || !result) throw new Error(result?.error || "This action is temporarily unavailable.");
  return result;
}

export function startTeamActionSecurity(workspaceRef: string, method: "google" | "email", purpose: BrokerdeskReauthPurpose) {
  return command<{ url?: string; sent?: boolean }>(
    `/api/v1/brokerdesk/workspaces/${encodeURIComponent(workspaceRef)}/reauth/start`,
    { method, purpose }
  );
}

export function startTeamInvitationSecurity(workspaceRef: string, method: "google" | "email") {
  return startTeamActionSecurity(workspaceRef, method, "team_invite");
}

export function inviteTeamMember(workspaceRef: string, email: string, rolePreset: InvitedRolePreset, idempotencyKey: string) {
  return command<{ invitationUrl: string; emailHint: string; expiresAt: string }>(
    `/api/v1/brokerdesk/workspaces/${encodeURIComponent(workspaceRef)}/team-invitations`,
    { email, rolePreset, idempotencyKey }
  );
}

export function replaceTeamMemberAccess(workspaceRef: string, memberRef: string, rolePreset: MutableTeamRolePreset, idempotencyKey: string) {
  return command<{ status: "updated" }>(
    `/api/v1/brokerdesk/workspaces/${encodeURIComponent(workspaceRef)}/team/${encodeURIComponent(memberRef)}/access`,
    { rolePreset, idempotencyKey }, "PUT"
  );
}

export function suspendTeamMember(workspaceRef: string, memberRef: string, idempotencyKey: string) {
  return command<{ status: "suspended" }>(
    `/api/v1/brokerdesk/workspaces/${encodeURIComponent(workspaceRef)}/team/${encodeURIComponent(memberRef)}/suspend`,
    { idempotencyKey }
  );
}
