import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { getBrokerdeskBootstrap } from "@/features/organizations/server/brokerdesk-onboarding.service";

export const metadata = { title: "BrokerDesk · Nakshatra", robots: { index: false, follow: false } };

export default async function BrokerdeskGatewayPage() {
  const { supabase } = await getAuthenticatedUser();
  const bootstrap = await getBrokerdeskBootstrap(supabase);
  const active = bootstrap.workspaces.find((workspace) => workspace.workspaceStatus === "active");
  if (active) redirect(`/brokerdesk/w/${active.workspaceRef}/dashboard`);
  redirect("/brokerdesk/onboarding");
}
