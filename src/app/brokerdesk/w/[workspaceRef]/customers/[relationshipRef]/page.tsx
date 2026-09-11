import Link from "next/link";
import { ArrowLeft, CalendarClock, LockKeyhole, MapPin, ShieldCheck, UserRound, Users } from "lucide-react";
import { getAuthenticatedUser } from "@/lib/auth";
import { resolveBrokerdeskCustomer } from "@/features/broker-relationships/server/customer-invitation.service";
import styles from "./brokerdesk-customer-detail.module.css";

export const metadata = { title: "Customer relationship · Nakshatra BrokerDesk", robots: { index: false, follow: false } };

function dateLabel(value: string | null) {
  return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value)) : "No end date";
}
export default async function BrokerdeskCustomerDetailPage({ params }: {
  params: Promise<{ workspaceRef: string; relationshipRef: string }>;
}) {
  const { workspaceRef, relationshipRef } = await params;
  const { supabase } = await getAuthenticatedUser();
  const customer = await resolveBrokerdeskCustomer(supabase, workspaceRef, relationshipRef);
  if (!customer.available) return <main className={styles.unavailable}><h1>Customer unavailable</h1><p>This relationship may not exist, may not be assigned to you, or may no longer permit access.</p><Link href={`/brokerdesk/w/${workspaceRef}/customers`}>Return to customers</Link></main>;

  return <div className={styles.shell}>
    <header><Link href="/brokerdesk" className={styles.wordmark}>NAKSHATRA</Link><span>BrokerDesk</span><Link href={`/brokerdesk/w/${workspaceRef}/customers`}>Customers</Link></header>
    <main>
      <Link className={styles.back} href={`/brokerdesk/w/${workspaceRef}/customers`}><ArrowLeft /> All customers</Link>
      <div className={styles.heading}><div className={styles.avatar}>{customer.displayName.slice(0, 1).toUpperCase()}</div><div><p>Customer relationship</p><h1>{customer.displayName}</h1><span>{[customer.gender, customer.location].filter(Boolean).join(" · ") || "Shared portfolio"}</span></div><span className={styles.status}>{customer.relationshipStatus}</span></div>
      <section className={styles.cards}>
        <article><ShieldCheck /><div><span>Portfolio</span><strong>{customer.portfolio.status === "published" ? "Ready to review" : "Customer is completing it"}</strong></div></article>
        <article><CalendarClock /><div><span>Representation term</span><strong>{dateLabel(customer.startsAt)} – {dateLabel(customer.endsAt)}</strong></div></article>
        <article><MapPin /><div><span>Shared location</span><strong>{customer.location || "Not added yet"}</strong></div></article>
      </section>
      <section className={styles.panel}><div className={styles.panelTitle}><Users /><div><h2>Assigned team</h2><p>Only assigned employees and workspace-wide owners or admins can work with this customer.</p></div></div>{customer.assignedTeam.length === 0 ? <p className={styles.empty}>No broker or coordinator is assigned yet.</p> : customer.assignedTeam.map((member) => <article className={styles.member} key={member.memberRef}><div className={styles.smallAvatar}><UserRound /></div><div><strong>{member.displayName}</strong><span>{member.rolePreset}</span></div></article>)}</section>
      <section className={styles.panel}><div className={styles.panelTitle}><ShieldCheck /><div><h2>Available work</h2><p>Actions are calculated from your role, assignment, and the customer&apos;s current mandate.</p></div></div><div className={styles.permissions}><span className={customer.actions.canReviewPortfolio ? styles.allowed : styles.blocked}>{customer.actions.canReviewPortfolio ? "Portfolio review allowed" : "Portfolio review unavailable"}</span><span className={customer.actions.canCreateIntroduction ? styles.allowed : styles.blocked}>{customer.actions.canCreateIntroduction ? "Introduction setup allowed" : "Introduction setup unavailable"}</span></div></section>
      <p className={styles.privacy}><LockKeyhole /> This page never reveals another broker, agency, or Introduction route.</p>
    </main>
  </div>;
}
