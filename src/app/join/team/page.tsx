import { TeamInvitationClient } from "./team-invitation-client";

export const metadata = {
  title: "Join a BrokerDesk team · Nakshatra",
  description: "Accept a private Nakshatra BrokerDesk team invitation.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function TeamInvitationPage() {
  return <TeamInvitationClient />;
}
