import type { Metadata } from "next";
import { PolicyLayout, PolicySection } from "@/components/legal/PolicyLayout";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <PolicyLayout
      eyebrow="About Nakshatra"
      title="A calmer, more respectful way to present wedding biodata."
      summary="Nakshatra helps people and families create a clear, mobile-friendly introduction without repeatedly sending new documents."
    >
      <PolicySection title="The product idea">
        <p>Start with essential details, add only what feels useful, choose a Light or Dark presentation, and decide between Balanced or Private sharing. A single active link can be updated when your story changes.</p>
      </PolicySection>
      <PolicySection title="The design promise">
        <p>Nakshatra uses readable typography, generous spacing, plain language, and explicit privacy cues. Rashi and constellation details support the identity without overwhelming the person at its center.</p>
      </PolicySection>
      <PolicySection title="Contact">
        <p>Questions or feedback are welcome at <a className="font-semibold text-[color:var(--workspace-teal)] underline underline-offset-4" href="mailto:hello@nakshatra.app">hello@nakshatra.app</a>.</p>
      </PolicySection>
    </PolicyLayout>
  );
}
