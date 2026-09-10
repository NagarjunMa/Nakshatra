"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Check, Copy, LockKeyhole, ShieldCheck, UserPlus, Users } from "lucide-react";
import type { BrokerdeskTeamResult } from "@/features/organization-access/server/brokerdesk-team.contract";
import type { InvitedRolePreset } from "@/features/organization-access/server/brokerdesk-team-invitation.contract";
import { inviteTeamMember, startTeamInvitationSecurity } from "@/features/organization-access/client/brokerdesk-team.api";
import styles from "./team-settings.module.css";

const roleLabels: Record<string, string> = { owner: "Owner", admin: "Admin", advisor: "Broker", coordinator: "Coordinator", viewer: "View only" };

export function TeamSettingsClient({ team, reauthComplete }: { team: BrokerdeskTeamResult; reauthComplete: boolean }) {
  const [mode, setMode] = useState<"list" | "security" | "invite">(reauthComplete ? "invite" : "list");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [invitationUrl, setInvitationUrl] = useState("");
  if (!team.available) return <main className={styles.unavailable}><h1>Team settings are unavailable</h1><p>This workspace may not exist, or you may not have permission to manage its team.</p><Link href="/brokerdesk">Return to BrokerDesk</Link></main>;
  const availableTeam = team;
  const currentRole = availableTeam.members.find((member) => member.isCurrentUser)?.rolePreset;

  async function security(method: "google" | "email") {
    setPending(true); setError("");
    try {
      const result = await startTeamInvitationSecurity(availableTeam.workspaceRef, method);
      if (result.url) window.location.assign(result.url);
      else if (result.sent) setNotice("We sent a private sign-in link to your verified account email. Open it to continue.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The security check could not start."); }
    finally { setPending(false); }
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(""); setInvitationUrl("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await inviteTeamMember(
        availableTeam.workspaceRef,
        String(form.get("email") || ""),
        String(form.get("rolePreset") || "") as InvitedRolePreset,
        `team-invite:${crypto.randomUUID()}`
      );
      setInvitationUrl(result.invitationUrl);
      setNotice(`Invitation created for ${result.emailHint}. It expires in 7 days.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The invitation could not be created."); }
    finally { setPending(false); }
  }

  return <div className={styles.shell}>
    <header><Link href="/brokerdesk" className={styles.wordmark}>NAKSHATRA</Link><span>BrokerDesk</span><Link href="/dashboard">Customer dashboard</Link></header>
    <main>
      <div className={styles.heading}><div><p>Settings · Team</p><h1>People who work with you</h1><span>Employees start without customer access. Assign customers only after they join.</span></div>{mode === "list" && <button onClick={() => setMode("security")}><UserPlus /> Invite employee</button>}</div>
      {error && <p className={styles.error} role="alert">{error}</p>}{notice && <p className={styles.notice}>{notice}</p>}
      {mode === "security" && <section className={styles.panel}><ShieldCheck /><h2>Confirm it is you</h2><p>Inviting someone gives them access to this business workspace. Complete a quick security check first.</p><div className={styles.actions}><button onClick={() => security("google")} disabled={pending}>Continue with Google</button><button onClick={() => security("email")} disabled={pending}>Email me a sign-in link</button><button className={styles.textButton} onClick={() => setMode("list")}>Cancel</button></div></section>}
      {mode === "invite" && <section className={styles.panel}><UserPlus /><h2>Invite an employee</h2><p>Use their work email. They must sign in with that same verified email address.</p><form onSubmit={invite}><label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} /></label><label>Role<select name="rolePreset" defaultValue="advisor"><option value="advisor">Broker — assigned customers only</option><option value="coordinator">Coordinator — assigned customers only</option><option value="viewer">View only — assigned customers only</option>{currentRole === "owner" && <option value="admin">Admin — all customers and settings</option>}</select></label><button type="submit" disabled={pending}>{pending ? "Creating invitation…" : "Create private invitation"}</button></form>{invitationUrl && <div className={styles.invitation}><Check /><strong>Private invitation ready</strong><p>Send this link only to the employee. It works once and only for their email address.</p><code>{invitationUrl}</code><button onClick={() => navigator.clipboard.writeText(invitationUrl)}><Copy /> Copy invitation link</button></div>}</section>}
      <section className={styles.team}><div className={styles.teamTitle}><Users /><h2>Current team</h2><span>{team.members.length}</span></div>{team.members.map((member) => <article key={member.memberRef}><div className={styles.avatar}>{member.displayName.slice(0,1).toUpperCase()}</div><div><strong>{member.displayName}{member.isCurrentUser ? " (you)" : ""}</strong><span>{member.email || "Verified account"}</span></div><span className={styles.role}>{roleLabels[member.rolePreset]}</span><span className={styles.access}>{member.customerAccess === "all_customers" ? "All customers" : member.customerAccess === "assigned_customers" ? `${member.assignedCustomerCount} assigned` : "No customer access"}</span><span className={`${styles.status} ${member.status === "suspended" ? styles.suspended : ""}`}>{member.status}</span></article>)}</section>
      <p className={styles.privacy}><LockKeyhole /> Brokers and employees never see other agencies or their activity.</p>
    </main>
  </div>;
}
