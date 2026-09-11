import Link from "next/link";
import { Building2, CalendarClock, LockKeyhole } from "lucide-react";
import { getAuthenticatedUser } from "@/lib/auth";
import { resolveCustomerBrokerRelationships } from "@/features/broker-relationships/server/customer-invitation.service";
import styles from "./brokers.module.css";

export const metadata = { title: "My brokers · Nakshatra", robots: { index: false, follow: false } };

function dateLabel(value: string | null) {
  return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value)) : "No end date";
}

export default async function CustomerBrokersPage() {
  const { supabase } = await getAuthenticatedUser();
  const result = await resolveCustomerBrokerRelationships(supabase);
  return <div className={styles.shell}>
    <header><Link href="/dashboard" className={styles.wordmark}>NAKSHATRA</Link><span>Your private broker relationships</span><Link href="/dashboard">Dashboard</Link></header>
    <main>
      <p className={styles.eyebrow}>Privacy controls</p>
      <h1>My brokers</h1>
      <p className={styles.lead}>You can work with more than one broker. Each broker sees only its own relationship and never learns which other brokers you use.</p>
      <section className={styles.list}>
        {result.relationships.length === 0 && <div className={styles.empty}><Building2 /><h2>No broker relationships yet</h2><p>A broker appears here only after you accept their private invitation.</p></div>}
        {result.relationships.map((relationship) => <article key={relationship.relationshipRef}>
          <div className={styles.icon}><Building2 /></div>
          <div><h2>{relationship.workspaceName}</h2><p><span className={styles.status}>{relationship.relationshipStatus}</span></p></div>
          <p className={styles.term}><CalendarClock /> {dateLabel(relationship.startsAt)} – {dateLabel(relationship.endsAt)}</p>
        </article>)}
      </section>
      <p className={styles.privacy}><LockKeyhole /> Only you can see this complete list.</p>
    </main>
  </div>;
}

