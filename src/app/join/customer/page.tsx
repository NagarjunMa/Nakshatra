import { CustomerInvitationClient } from "./customer-invitation-client";

export const metadata = {
  title: "Join your broker · Nakshatra",
  description: "Accept a private Nakshatra BrokerDesk customer invitation.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function CustomerInvitationPage() {
  return <CustomerInvitationClient />;
}

