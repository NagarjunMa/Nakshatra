"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Check, Copy, LockKeyhole, ShieldCheck, SlidersHorizontal, UserPlus, UserX, Users } from "lucide-react";
import type { BrokerdeskTeamResult } from "@/features/organization-access/server/brokerdesk-team.contract";
import type { BrokerdeskReauthPurpose } from "@/features/organization-access/server/brokerdesk-reauth.contract";
import type { InvitedRolePreset } from "@/features/organization-access/server/brokerdesk-team-invitation.contract";
import type { MutableTeamRolePreset } from "@/features/organization-access/server/brokerdesk-team-command.contract";
import { inviteTeamMember, replaceTeamMemberAccess, startTeamActionSecurity, suspendTeamMember } from "@/features/organization-access/client/brokerdesk-team.api";
import styles from "./team-settings.module.css";

const roleLabels: Record<string, string> = { owner: "Owner", admin: "Admin", advisor: "Broker", coordinator: "Coordinator", viewer: "View only" };
type AvailableTeam = Extract<BrokerdeskTeamResult, { available: true }>;
type Member = AvailableTeam["members"][number];
type Mode = "list" | "security" | "invite" | "access" | "suspend";
type TeamPurpose = Extract<BrokerdeskReauthPurpose, "team_invite" | "team_access_replace" | "team_suspend">;

export function TeamSettingsClient({ team, reauthPurpose }: { team: BrokerdeskTeamResult; reauthPurpose: BrokerdeskReauthPurpose | null }) {
  const initialPurpose = reauthPurpose === "team_invite" || reauthPurpose === "team_access_replace" || reauthPurpose === "team_suspend" ? reauthPurpose : null;
  const [mode, setMode] = useState<Mode>(initialPurpose === "team_invite" ? "invite" : "list");
  const [verifiedPurpose, setVerifiedPurpose] = useState<TeamPurpose | null>(initialPurpose);
  const [securityPurpose, setSecurityPurpose] = useState<TeamPurpose>("team_invite");
  const [selected, setSelected] = useState<Member | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(initialPurpose && initialPurpose !== "team_invite" ? "Security confirmed. Choose the employee action again to continue." : "");
  const [invitationUrl, setInvitationUrl] = useState("");
  const [members, setMembers] = useState<Member[]>(team.available ? team.members : []);
  useEffect(() => {
    if (reauthPurpose) window.history.replaceState(null, "", window.location.pathname);
  }, [reauthPurpose]);
  if (!team.available) return <main className={styles.unavailable}><h1>Team settings are unavailable</h1><p>This workspace may not exist, or you may not have permission to manage its team.</p><Link href="/brokerdesk">Return to BrokerDesk</Link></main>;
  const availableTeam = team;
  const currentRole = members.find((member) => member.isCurrentUser)?.rolePreset;

  function begin(purpose: TeamPurpose, member?: Member) {
    setError(""); setNotice(""); setSelected(member || null); setSecurityPurpose(purpose);
    if (verifiedPurpose === purpose) setMode(purpose === "team_invite" ? "invite" : purpose === "team_access_replace" ? "access" : "suspend");
    else setMode("security");
  }

  async function security(method: "google" | "email") {
    setPending(true); setError("");
    try {
      const result = await startTeamActionSecurity(availableTeam.workspaceRef, method, securityPurpose);
      if (result.url) window.location.assign(result.url);
      else if (result.sent) setNotice("We sent a private sign-in link to your verified account email. Open it to continue.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The security check could not start."); }
    finally { setPending(false); }
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(""); setInvitationUrl("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await inviteTeamMember(availableTeam.workspaceRef, String(form.get("email") || ""), String(form.get("rolePreset") || "") as InvitedRolePreset, `team-invite:${crypto.randomUUID()}`);
      setInvitationUrl(result.invitationUrl); setVerifiedPurpose(null);
      setNotice(`Invitation created for ${result.emailHint}. It expires in 7 days.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The invitation could not be created."); }
    finally { setPending(false); }
  }

  async function replaceAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected) return; setPending(true); setError("");
    const rolePreset = String(new FormData(event.currentTarget).get("rolePreset") || "") as MutableTeamRolePreset;
    try {
      await replaceTeamMemberAccess(availableTeam.workspaceRef, selected.memberRef, rolePreset, `team-access:${crypto.randomUUID()}`);
      setMembers((current) => current.map((member) => member.memberRef === selected.memberRef ? {
        ...member, rolePreset,
        customerAccess: rolePreset === "admin" ? "all_customers" : member.assignedCustomerCount > 0 ? "assigned_customers" : "none",
      } : member));
      setVerifiedPurpose(null); setMode("list");
      setNotice(`${selected.displayName}'s role is now ${roleLabels[rolePreset]}. The change is effective immediately.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The team change could not be saved."); }
    finally { setPending(false); }
  }

  async function suspend() {
    if (!selected) return; setPending(true); setError("");
    try {
      await suspendTeamMember(availableTeam.workspaceRef, selected.memberRef, `team-suspend:${crypto.randomUUID()}`);
      setMembers((current) => current.map((member) => member.memberRef === selected.memberRef ? { ...member, status: "suspended" } : member));
      setVerifiedPurpose(null); setMode("list");
      setNotice(`${selected.displayName} is suspended. Their access to this business stopped immediately.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The employee could not be suspended."); }
    finally { setPending(false); }
  }

  return <div className={styles.shell}>
    <header><Link href="/brokerdesk" className={styles.wordmark}>NAKSHATRA</Link><span>BrokerDesk</span><Link href="/dashboard">Customer dashboard</Link></header>
    <main>
      <div className={styles.heading}><div><p>Settings · Team</p><h1>People who work with you</h1><span>Employees see only the customers and work their role allows.</span></div>{mode === "list" && <button onClick={() => begin("team_invite")}><UserPlus /> Invite employee</button>}</div>
      {error && <p className={styles.error} role="alert">{error}</p>}{notice && <p className={styles.notice}>{notice}</p>}
      {mode === "security" && <section className={styles.panel}><ShieldCheck /><h2>Confirm it is you</h2><p>This action changes who can use your business workspace. Complete a quick security check first.</p><div className={styles.actions}><button onClick={() => security("google")} disabled={pending}>Continue with Google</button><button onClick={() => security("email")} disabled={pending}>Email me a sign-in link</button><button className={styles.textButton} onClick={() => setMode("list")}>Cancel</button></div></section>}
      {mode === "invite" && <section className={styles.panel}><UserPlus /><h2>Invite an employee</h2><p>Use their work email. They must sign in with that same verified email address.</p><form onSubmit={invite}><label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} /></label><label>Role<select name="rolePreset" defaultValue="advisor"><option value="advisor">Broker — assigned customers only</option><option value="coordinator">Coordinator — assigned customers only</option><option value="viewer">View only — assigned customers only</option>{currentRole === "owner" && <option value="admin">Admin — all customers and settings</option>}</select></label><button type="submit" disabled={pending}>{pending ? "Creating invitation…" : "Create private invitation"}</button></form>{invitationUrl && <div className={styles.invitation}><Check /><strong>Private invitation ready</strong><p>Send this link only to the employee. It works once and only for their email address.</p><code>{invitationUrl}</code><button onClick={() => navigator.clipboard.writeText(invitationUrl)}><Copy /> Copy invitation link</button></div>}</section>}
      {mode === "access" && selected && <section className={styles.panel}><SlidersHorizontal /><h2>Change {selected.displayName}&apos;s role</h2><p>The new role applies immediately. Existing customer assignments stay in place but are usable only when the new role permits them.</p><form onSubmit={replaceAccess}><label>Role<select name="rolePreset" defaultValue={selected.rolePreset}><option value="advisor">Broker — assigned customers only</option><option value="coordinator">Coordinator — assigned customers only</option><option value="viewer">View only — assigned customers only</option>{currentRole === "owner" && <option value="admin">Admin — all customers and settings</option>}</select></label><button type="submit" disabled={pending}>{pending ? "Saving…" : "Save role"}</button></form><button className={styles.textButton} onClick={() => setMode("list")}>Cancel</button></section>}
      {mode === "suspend" && selected && <section className={styles.panel}><UserX /><h2>Suspend {selected.displayName}?</h2><p>They will immediately lose access to this business. Their Nakshatra account, customer profile, and access through any other agency are not changed.</p><div className={styles.actions}><button className={styles.dangerButton} onClick={suspend} disabled={pending}>{pending ? "Suspending…" : "Suspend access"}</button><button className={styles.textButton} onClick={() => setMode("list")}>Cancel</button></div></section>}
      <section className={styles.team}><div className={styles.teamTitle}><Users /><h2>Current team</h2><span>{members.length}</span></div>{members.map((member) => {
        const manageable = member.status === "active" && !member.isCurrentUser && member.rolePreset !== "owner" && !(currentRole === "admin" && member.rolePreset === "admin");
        return <article key={member.memberRef}><div className={styles.avatar}>{member.displayName.slice(0, 1).toUpperCase()}</div><div><strong>{member.displayName}{member.isCurrentUser ? " (you)" : ""}</strong><span>{member.email || "Verified account"}</span></div><span className={styles.role}>{roleLabels[member.rolePreset]}</span><span className={styles.access}>{member.customerAccess === "all_customers" ? "All customers" : member.customerAccess === "assigned_customers" ? `${member.assignedCustomerCount} assigned` : "No customer access"}</span><span className={`${styles.status} ${member.status === "suspended" ? styles.suspended : ""}`}>{member.status}</span>{manageable && <div className={styles.memberActions}><button aria-label={`Change role for ${member.displayName}`} onClick={() => begin("team_access_replace", member)}>Change role</button><button aria-label={`Suspend ${member.displayName}`} onClick={() => begin("team_suspend", member)}>Suspend</button></div>}</article>;
      })}</section>
      <p className={styles.privacy}><LockKeyhole /> Brokers and employees never see other agencies or their activity.</p>
    </main>
  </div>;
}
