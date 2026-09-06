import type { Metadata } from "next";
import { LandingExperience } from "@/components/landing/LandingExperience";

export const metadata: Metadata = {
  title: "Story-first concept | Nakshatra",
  robots: { index: false, follow: false },
};

export default function StoryLandingPage() {
  return <LandingExperience variant="story" />;
}
