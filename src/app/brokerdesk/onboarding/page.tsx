import { getAuthenticatedUser } from "@/lib/auth";
import {
  getBrokerdeskBootstrap,
  getBrokerdeskOnboarding,
} from "@/features/organizations/server/brokerdesk-onboarding.service";
import { BrokerdeskOnboardingClient } from "./brokerdesk-onboarding-client";

export const metadata = {
  title: "Set up BrokerDesk · Nakshatra",
  description: "Set up and privately verify your matrimonial business workspace.",
  robots: { index: false, follow: false },
};

export default async function BrokerdeskOnboardingPage() {
  const { supabase } = await getAuthenticatedUser();
  const bootstrap = await getBrokerdeskBootstrap(supabase);
  const pending = bootstrap.workspaces.find((workspace) => workspace.workspaceStatus === "onboarding");
  const resolved = pending
    ? await getBrokerdeskOnboarding(supabase, pending.workspaceRef)
    : { available: false as const };

  return <BrokerdeskOnboardingClient initialOnboarding={resolved.available ? resolved : null} />;
}
