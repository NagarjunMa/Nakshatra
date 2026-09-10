"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Check, Copy, LockKeyhole, Mail, UserPlus, Users } from "lucide-react";
import type { BrokerdeskCustomers } from "@/features/broker-relationships/server/customer-invitation.contract";
import { inviteBrokerdeskCustomer } from "@/features/broker-relationships/client/customer-invitation.api";
import styles from "./brokerdesk-customers.module.css";

type Available = Extract<BrokerdeskCustomers, { available: true }>;

export function BrokerdeskCustomersClient({ customers }: { customers: BrokerdeskCustomers }) {
  const [showInvite, setShowInvite] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [invitationUrl, setInvitationUrl] = useState("");
  const grouped = useMemo(() => {
    if (!customers.available) return { men: [], women: [], other: [], invitations: [] };
    const relationships = customers.customers.filter((item) => item.kind === "relationship");
    return {
      men: relationships.filter((item) => item.gender?.toLowerCase() === "male"),
      women: relationships.filter((item) => item.gender?.toLowerCase() === "female"),
      other: relationships.filter((item) => !["male", "female"].includes(item.gender?.toLowerCase() || "")),
      invitations: customers.customers.filter((item) => item.kind === "invitation"),
    };
  }, [customers]);

  if (!customers.available) return <main className={styles.unavailable}><h1>Customers are unavailable</h1><p>This workspace may not exist, or your role may not permit customer access.</p><Link href="/brokerdesk">Return to BrokerDesk</Link></main>;
  const available: Available = customers;

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(""); setNotice(""); setInvitationUrl("");
    const email = String(new FormData(event.currentTarget).get("email") || "");
    try {
      const result = await inviteBrokerdeskCustomer(
        available.workspaceRef,
        email,
        `customer-invite:${crypto.randomUUID()}`
      );
      setInvitationUrl(result.invitationUrl);
      setNotice(`Private invitation created for ${result.emailHint}. It expires in 7 days.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The invitation could not be created.");
    } finally { setPending(false); }
  }

  const activeCount = grouped.men.length + grouped.women.length + grouped.other.length;
  return <div className={styles.shell}>
    <header><Link href="/brokerdesk" className={styles.wordmark}>NAKSHATRA</Link><span>BrokerDesk</span><nav><Link href="/brokerdesk">Home</Link><strong>Customers</strong><Link href={`/brokerdesk/w/${available.workspaceRef}/settings/team`}>Settings</Link></nav></header>
    <main>
      <div className={styles.heading}><div><p>Customers</p><h1>People you represent</h1><span>Invite customers and work from the portfolio each customer owns.</span></div><button onClick={() => setShowInvite((value) => !value)}><UserPlus /> Invite customer</button></div>
      {error && <p className={styles.error} role="alert">{error}</p>}{notice && <p className={styles.notice}>{notice}</p>}
      {showInvite && <section className={styles.invitePanel}><Mail /><div><h2>Invite one customer</h2><p>Use the customer&apos;s own email. No profile is created until that person signs in and consents.</p></div><form onSubmit={invite}><label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} /></label><button type="submit" disabled={pending}>{pending ? "Creating…" : "Create private invitation"}</button></form>{invitationUrl && <div className={styles.invitation}><Check /><strong>Invitation ready</strong><p>Send this private link to the customer by your usual trusted channel.</p><code>{invitationUrl}</code><button onClick={() => navigator.clipboard.writeText(invitationUrl)}><Copy /> Copy link</button></div>}</section>}
      <section className={styles.summary}><article><Users /><span>Active customers</span><strong>{activeCount}</strong></article><article><Mail /><span>Invitations needing action</span><strong>{grouped.invitations.length}</strong></article></section>
      <CustomerGroup title="Men" items={grouped.men} />
      <CustomerGroup title="Women" items={grouped.women} />
      {grouped.other.length > 0 && <CustomerGroup title="Other profiles" items={grouped.other} />}
      <section className={styles.group}><div className={styles.groupTitle}><h2>Invitations</h2><span>{grouped.invitations.length}</span></div>{grouped.invitations.length === 0 ? <p className={styles.empty}>No invitations are waiting.</p> : grouped.invitations.map((item) => <article className={styles.row} key={item.invitationRef}><div className={styles.avatar}><Mail /></div><div><strong>{item.emailHint}</strong><span>{invitationLabel(item.invitationStatus)}</span></div><span className={styles.state}>{item.invitationStatus.replace("_", " ")}</span></article>)}</section>
      <p className={styles.privacy}><LockKeyhole /> This list never reveals whether a customer works with another broker.</p>
    </main>
  </div>;
}

function CustomerGroup({ title, items }: {
  title: string;
  items: Extract<Available["customers"][number], { kind: "relationship" }>[];
}) {
  return <section className={styles.group}><div className={styles.groupTitle}><h2>{title}</h2><span>{items.length}</span></div>{items.length === 0 ? <p className={styles.empty}>No customers in this section yet.</p> : items.map((item) => <article className={styles.row} key={item.relationshipRef}><div className={styles.avatar}>{item.displayName.slice(0, 1).toUpperCase()}</div><div><strong>{item.displayName}</strong><span>{item.portfolioStatus === "published" ? "Portfolio ready" : "Completing portfolio"}</span></div><span className={styles.state}>{item.relationshipStatus}</span></article>)}</section>;
}

function invitationLabel(status: string) {
  if (status === "portfolio_required") return "Customer joined · portfolio not complete";
  if (status === "invited") return "Waiting for customer";
  if (status === "expired") return "Invitation expired · send a new one if needed";
  return status === "revoked" ? "Replaced by a newer invitation" : "Relationship active";
}
