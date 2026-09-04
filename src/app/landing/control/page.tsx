import type { Metadata } from "next";
import { LandingExperience } from "@/components/landing/LandingExperience";

export const metadata: Metadata = {
  title: "Privacy-first concept | Nakshatra",
  robots: { index: false, follow: false },
};

export default function ControlLandingPage() {
  return <LandingExperience variant="control" />;
}
