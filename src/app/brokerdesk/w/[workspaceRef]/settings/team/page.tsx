import { getAuthenticatedUser } from "@/lib/auth";
import { resolveBrokerDeskTeam } from "@/features/organization-access/server/organization-access.service";
import { TeamSettingsClient } from "./team-settings-client";
import { brokerdeskReauthPurposeSchema } from "@/features/organization-access/server/brokerdesk-reauth.contract";

export const metadata = { title: "Team settings · Nakshatra BrokerDesk", robots: { index: false, follow: false } };

export default async function TeamSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceRef: string }>;
  searchParams: Promise<{ reauth?: string; action?: string }>;
}) {
  const { workspaceRef } = await params;
  const { supabase } = await getAuthenticatedUser();
  const team = await resolveBrokerDeskTeam(supabase, workspaceRef);
  const query = await searchParams;
  const purpose = brokerdeskReauthPurposeSchema.safeParse(query.action);
  return <TeamSettingsClient
    team={team}
    reauthPurpose={query.reauth === "complete" && purpose.success ? purpose.data : null}
  />;
}
