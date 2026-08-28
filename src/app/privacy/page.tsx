import type { Metadata } from "next";
import { PolicyLayout, PolicySection } from "@/components/legal/PolicyLayout";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <PolicyLayout
      eyebrow="Privacy"
      title="Your biodata should never reveal more than you intend."
      summary="This notice explains what Nakshatra uses to create and share your biodata, what can become public, and the controls currently available to you."
    >
      <PolicySection title="Information you provide">
        <p>Depending on what you choose to complete, Nakshatra may store identity and contact details, education and work information, family background, lifestyle and partner preferences, astrology details, photos, and an optional horoscope document.</p>
        <p>We use this information to save your private draft, create the biodata views you request, operate sharing controls, and maintain your account.</p>
      </PolicySection>

      <PolicySection title="Public, approved, and private information">
        <p>Your draft is private until you publish. A public introduction can be opened by anyone who receives its link, and recipients may forward that link.</p>
        <p>Exact birth details, direct contact information, income, and original horoscope documents are kept outside the public introduction. Light or Dark changes appearance; Balanced or Private changes how much the public introduction reveals.</p>
      </PolicySection>

      <PolicySection title="Storage and service providers">
        <p>Nakshatra uses contracted infrastructure providers for authentication, database storage, private file storage, and delivery of account emails. These providers process information only to operate the service.</p>
        <p>Public pages are marked not to be indexed by search engines, but this cannot prevent a person who has the link from saving or forwarding what they can view.</p>
      </PolicySection>

      <PolicySection title="Your choices and requests">
        <p>You can edit a draft, change appearance and privacy mode, unpublish a biodata, replace its public link, or allow the link to expire. Public links currently expire after 90 days unless renewed.</p>
        <p>Self-service account deletion is not available yet. To request access, correction, deletion, consent withdrawal, or help with a privacy concern, email <a className="font-semibold text-[color:var(--workspace-teal)] underline underline-offset-4" href="mailto:hello@nakshatra.app">hello@nakshatra.app</a>.</p>
      </PolicySection>

      <PolicySection title="Age and safety">
        <p>Nakshatra is intended for adults aged 18 and over. Do not upload another person&apos;s private information or documents unless you have their permission and are authorized to manage the biodata.</p>
      </PolicySection>

      <p className="text-sm text-[color:var(--workspace-ink-muted)]">Last updated: August 28, 2026.</p>
    </PolicyLayout>
  );
}
