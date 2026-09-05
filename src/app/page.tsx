import type { Metadata } from "next";
import { LandingExperience } from "@/components/landing/LandingExperience";

export const metadata: Metadata = {
  title: "Nakshatra - Digital Marriage Portfolio",
  description:
    "Replace scattered biodata files with one current marriage portfolio and decide who receives the complete view.",
};

export default function Home() {
  return <LandingExperience variant="clarity" />;
}
