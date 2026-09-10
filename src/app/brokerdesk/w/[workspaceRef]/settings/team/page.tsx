import { getAuthenticatedUser } from "@/lib/auth";
import { resolveBrokerDeskTeam } from "@/features/organization-access/server/organization-access.service";
import { TeamSettingsClient } from "./team-settings-client";

export const metadata = { title: "Team settings · Nakshatra BrokerDesk", robots: { index: false, follow: false } };

export default async function TeamSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceRef: string }>;
  searchParams: Promise<{ reauth?: string }>;
}) {
  const { workspaceRef } = await params;
  const { supabase } = await getAuthenticatedUser();
  const team = await resolveBrokerDeskTeam(supabase, workspaceRef);
  const query = await searchParams;
  return <TeamSettingsClient team={team} reauthComplete={query.reauth === "complete"} />;
}
