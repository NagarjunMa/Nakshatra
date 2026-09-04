import type { Metadata } from "next";
import { LandingExperience } from "@/components/landing/LandingExperience";

export const metadata: Metadata = {
  title: "Nakshatra - Digital Marriage Portfolio",
  description:
    "Create one clear marriage portfolio, keep it current, and decide what each family can see.",
};

export default function Home() {
  return <LandingExperience variant="clarity" />;
}
