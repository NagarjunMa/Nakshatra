import { getAuthenticatedUser } from "@/lib/auth";
import { resolveBrokerdeskCustomers } from "@/features/broker-relationships/server/customer-invitation.service";
import { BrokerdeskCustomersClient } from "./brokerdesk-customers-client";

export const metadata = { title: "Customers · Nakshatra BrokerDesk", robots: { index: false, follow: false } };

export default async function BrokerdeskCustomersPage({ params }: { params: Promise<{ workspaceRef: string }> }) {
  const { workspaceRef } = await params;
  const { supabase } = await getAuthenticatedUser();
  const customers = await resolveBrokerdeskCustomers(supabase, workspaceRef);
  return <BrokerdeskCustomersClient customers={customers} />;
}

