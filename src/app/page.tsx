import type { Metadata } from "next";
import { LandingExperience } from "@/components/landing/LandingExperience";

export const metadata: Metadata = {
  title: "Nakshatra | Private Wedding Biodata Portfolio",
  description:
    "Create one current wedding biodata portfolio, share a clear First View, and approve who receives protected details. Invite-only private beta.",
  openGraph: {
    type: "website",
    url: "/",
    title: "Nakshatra | One introduction. On your terms.",
    description:
      "A private wedding biodata portfolio with one current link and protected details shared only after approval.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nakshatra | One introduction. On your terms.",
    description:
      "A private wedding biodata portfolio with one current link and protected details shared only after approval.",
  },
};

export default function Home() {
  return <LandingExperience variant="clarity" />;
}
