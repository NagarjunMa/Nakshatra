import type { Metadata } from "next";
import { LandingExperience } from "@/components/landing/LandingExperience";

export const metadata: Metadata = {
  title: "Family-first concept | Nakshatra",
  robots: { index: false, follow: false },
};

export default function FamilyLandingPage() {
  return <LandingExperience variant="family" />;
}
