"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Check, ChevronRight, LockKeyhole, ShieldCheck } from "lucide-react";
import type { BrokerdeskOnboarding, BrokerdeskProfileUpdate } from "@/features/organizations/server/brokerdesk-onboarding.contract";
import { createWorkspace, saveOnboarding } from "@/features/organizations/client/brokerdesk-onboarding.api";

type Step = "business" | "representative" | "practice" | "review" | "verification";
const STEPS: { key: Step; label: string }[] = [
  { key: "business", label: "Business" },
  { key: "representative", label: "You" },
  { key: "practice", label: "Your service" },
  { key: "review", label: "Review" },
  { key: "verification", label: "Verification" },
];

function commandKey(prefix: string) {
  return `${prefix}:${crypto.randomUUID()}`;
}

export function BrokerdeskOnboardingClient({
  initialOnboarding,
}: {
  initialOnboarding: BrokerdeskOnboarding | null;
}) {
  const [onboarding, setOnboarding] = useState(initialOnboarding);
  const [step, setStep] = useState<Step>(
    initialOnboarding ? (initialOnboarding.nextStage as Step) : "business"
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const profile = onboarding?.profile;

  async function run(action: () => Promise<BrokerdeskOnboarding>, next?: Step) {
    setPending(true);
    setError("");
    try {
      const result = await action();
      setOnboarding(result);
      setStep(next || (result.nextStage as Step));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not save your details.");
    } finally {
      setPending(false);
    }
  }

  async function save(profileUpdate: BrokerdeskProfileUpdate, next: Step, submit = false) {
    if (!onboarding) return;
    await run(() => saveOnboarding(
      onboarding.workspaceRef,
      profileUpdate,
      onboarding.version,
      submit,
      commandKey(submit ? "submit" : "save")
    ), next);
  }

  const currentIndex = STEPS.findIndex((item) => item.key === step);

  return (
    <div className="brokerdesk-onboarding-shell">
      <header className="brokerdesk-onboarding-header">
        <Link href="/" className="brokerdesk-wordmark">NAKSHATRA</Link>
        <span>BrokerDesk setup</span>
        <Link href="/dashboard" className="brokerdesk-customer-link">Customer dashboard</Link>
      </header>

      <main className="brokerdesk-onboarding-main">
        <aside className="brokerdesk-step-panel" aria-label="Setup progress">
          <div className="brokerdesk-private-note">
            <LockKeyhole aria-hidden="true" />
            <div><strong>Private while you set up</strong><span>Customers cannot find this workspace yet.</span></div>
          </div>
          <ol>
            {STEPS.map((item, index) => (
              <li key={item.key} className={index === currentIndex ? "is-current" : index < currentIndex ? "is-complete" : ""}>
                <span>{index < currentIndex ? <Check aria-hidden="true" /> : index + 1}</span>
                <div><small>Step {index + 1}</small><strong>{item.label}</strong></div>
              </li>
            ))}
          </ol>
        </aside>

        <section className="brokerdesk-onboarding-card" aria-live="polite" aria-busy={pending}>
          {error && <p className="brokerdesk-form-error" role="alert">{error}</p>}
          {step === "business" && (
            <BusinessStep
              defaults={profile}
              pending={pending}
              onSubmit={(data) => onboarding
                ? save(data, "representative")
                : run(() => createWorkspace(data, commandKey("create")), "representative")}
            />
          )}
          {step === "representative" && profile && (
            <RepresentativeStep defaults={profile} pending={pending} onBack={() => setStep("business")} onSubmit={(data) => save(data, "practice")} />
          )}
          {step === "practice" && profile && (
            <PracticeStep defaults={profile} pending={pending} onBack={() => setStep("representative")} onSubmit={(data) => save(data, "review")} />
          )}
          {step === "review" && onboarding && (
            <ReviewStep onboarding={onboarding} pending={pending} onBack={() => setStep("practice")} onSubmit={(data) => save(data, "verification", true)} />
          )}
          {step === "verification" && onboarding && <VerificationStep onboarding={onboarding} />}
        </section>
      </main>
    </div>
  );
}

type FormEvent = React.FormEvent<HTMLFormElement>;
type Profile = BrokerdeskOnboarding["profile"] | undefined;

function value(form: FormData, key: string) {
  return String(form.get(key) || "").trim();
}

function BusinessStep({ defaults, pending, onSubmit }: { defaults?: Profile; pending: boolean; onSubmit: (data: Parameters<typeof createWorkspace>[0]) => void }) {
  function submit(event: FormEvent) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSubmit({
      legalName: value(form, "legalName"),
      tradingName: value(form, "tradingName") || null,
      businessType: value(form, "businessType") as Parameters<typeof createWorkspace>[0]["businessType"],
      registrationNumber: value(form, "registrationNumber") || null,
      registrationCountry: value(form, "registrationCountry") || null,
      primaryCity: value(form, "primaryCity"),
      primaryRegion: value(form, "primaryRegion") || null,
      primaryCountry: value(form, "primaryCountry"),
    });
  }
  return <form onSubmit={submit} className="brokerdesk-form">
    <StepHeading icon={<Building2 />} eyebrow="Business details" title="Tell us about your business" body="Use the name shown on your registration documents. You can save trading or brand names separately." />
    <div className="brokerdesk-field-grid">
      <Field label="Legal business name" name="legalName" defaultValue={defaults?.legalName} required wide hint="Exactly as registered, if your business is registered." />
      <Field label="Trading or brand name" name="tradingName" defaultValue={defaults?.tradingName || ""} wide optional />
      <SelectField label="Business type" name="businessType" defaultValue={defaults?.businessType || ""} required options={[
        ["", "Choose business type"], ["sole_proprietorship", "Sole proprietorship"], ["partnership", "Partnership"],
        ["private_limited", "Private limited company"], ["public_limited", "Public limited company"],
        ["nonprofit", "Nonprofit"], ["other", "Other"],
      ]} />
      <Field label="Registration number" name="registrationNumber" defaultValue={defaults?.registrationNumber || ""} optional />
      <Field label="Registration country code" name="registrationCountry" defaultValue={defaults?.registrationCountry || ""} placeholder="IN" maxLength={2} optional />
      <Field label="Primary city" name="primaryCity" defaultValue={defaults?.primaryCity} required />
      <Field label="State or region" name="primaryRegion" defaultValue={defaults?.primaryRegion || ""} optional />
      <Field label="Country code" name="primaryCountry" defaultValue={defaults?.primaryCountry || "IN"} placeholder="IN" maxLength={2} required />
    </div>
    <FormActions pending={pending} primary="Continue to your details" />
  </form>;
}

function RepresentativeStep({ defaults, pending, onBack, onSubmit }: { defaults: NonNullable<Profile>; pending: boolean; onBack: () => void; onSubmit: (data: BrokerdeskProfileUpdate) => void }) {
  function submit(event: FormEvent) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    onSubmit({
      representativeFullName: value(form,"representativeFullName"),
      representativePosition: value(form,"representativePosition"),
      representativeWorkEmail: value(form,"representativeWorkEmail") || null,
      representativeWorkPhone: value(form,"representativeWorkPhone") || null,
    });
  }
  return <form onSubmit={submit} className="brokerdesk-form">
    <StepHeading icon={<ShieldCheck />} eyebrow="Your details" title="Who is responsible for this workspace?" body="This person must be authorized to represent the business. We will verify identity separately." />
    <div className="brokerdesk-field-grid">
      <Field label="Full name" name="representativeFullName" defaultValue={defaults.representativeFullName || ""} required wide />
      <Field label="Position in the business" name="representativePosition" defaultValue={defaults.representativePosition || ""} placeholder="Owner, Director, Partner…" required wide />
      <Field label="Work email" name="representativeWorkEmail" type="email" defaultValue={defaults.representativeWorkEmail || ""} optional />
      <Field label="Work phone" name="representativeWorkPhone" type="tel" defaultValue={defaults.representativeWorkPhone || ""} optional hint="Provide at least one work contact." />
    </div>
    <FormActions pending={pending} primary="Continue to your service" onBack={onBack} />
  </form>;
}

function PracticeStep({ defaults, pending, onBack, onSubmit }: { defaults: NonNullable<Profile>; pending: boolean; onBack: () => void; onSubmit: (data: BrokerdeskProfileUpdate) => void }) {
  function submit(event: FormEvent) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    onSubmit({
      serviceRegions: value(form,"serviceRegions").split(",").map((item) => item.trim()).filter(Boolean),
      operatingSinceYear: Number(value(form,"operatingSinceYear")),
      website: value(form,"website") || null,
      authorityContext: value(form,"authorityContext"),
    });
  }
  return <form onSubmit={submit} className="brokerdesk-form">
    <StepHeading icon={<Building2 />} eyebrow="Your service" title="How does your practice operate?" body="A short, factual description helps us review the business without making setup complicated." />
    <div className="brokerdesk-field-grid">
      <Field label="Service cities or regions" name="serviceRegions" defaultValue={defaults.serviceRegions.join(", ")} placeholder="Bengaluru, Mysuru" hint="Separate locations with commas." required wide />
      <Field label="Operating since" name="operatingSinceYear" type="number" defaultValue={defaults.operatingSinceYear?.toString() || ""} min="1800" max={new Date().getFullYear().toString()} required />
      <Field label="Business website" name="website" type="url" defaultValue={defaults.website || ""} placeholder="https://example.com" optional />
      <label className="brokerdesk-field is-wide"><span>Why are you authorized to represent this business?</span><textarea name="authorityContext" defaultValue={defaults.authorityContext || ""} minLength={10} maxLength={1000} required rows={5} /><small>For example: “I am the owner and manage customer relationships.”</small></label>
    </div>
    <FormActions pending={pending} primary="Review my details" onBack={onBack} />
  </form>;
}

function ReviewStep({ onboarding, pending, onBack, onSubmit }: { onboarding: BrokerdeskOnboarding; pending: boolean; onBack: () => void; onSubmit: (data: BrokerdeskProfileUpdate) => void }) {
  const rows = useMemo(() => [
    ["Business", onboarding.profile.legalName],
    ["Location", [onboarding.profile.primaryCity, onboarding.profile.primaryRegion, onboarding.profile.primaryCountry].filter(Boolean).join(", ")],
    ["Representative", `${onboarding.profile.representativeFullName} · ${onboarding.profile.representativePosition}`],
    ["Service areas", onboarding.profile.serviceRegions.join(", ")],
  ], [onboarding]);
  function submit(event: FormEvent) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    onSubmit({ authorityDeclared: form.get("authorityDeclared") === "on", termsAccepted: form.get("termsAccepted") === "on" });
  }
  return <form onSubmit={submit} className="brokerdesk-form">
    <StepHeading icon={<Check />} eyebrow="Review" title="Please confirm the details" body="Your workspace is still private. Submission starts review; it does not automatically verify or publish the business." />
    <dl className="brokerdesk-review-list">{rows.map(([label, detail]) => <div key={label}><dt>{label}</dt><dd>{detail}</dd></div>)}</dl>
    <label className="brokerdesk-check"><input type="checkbox" name="authorityDeclared" defaultChecked={onboarding.profile.authorityDeclared} required /><span>I confirm that I am authorized to create and manage this workspace for the business.</span></label>
    <label className="brokerdesk-check"><input type="checkbox" name="termsAccepted" defaultChecked={onboarding.profile.termsAccepted} required /><span>I accept the Nakshatra Terms and understand that verification may require supporting evidence.</span></label>
    <FormActions pending={pending} primary="Submit for verification" onBack={onBack} />
  </form>;
}

function VerificationStep({ onboarding }: { onboarding: BrokerdeskOnboarding }) {
  const labels = { representative_identity: "Representative identity", business_registration: "Business registration", business_contact: "Business contact" };
  const statuses = { required: "Required", under_review: "Under review", verified: "Verified", needs_attention: "Needs attention", expired: "Expired" };
  return <div className="brokerdesk-form">
    <StepHeading icon={<ShieldCheck />} eyebrow="Verification" title="Your details are ready for review" body="Your workspace remains private until the required checks are complete. We will never mark it verified from form submission alone." />
    <div className="brokerdesk-verification-list">{onboarding.verificationChecks.map((check) => <div key={check.type}><span><strong>{labels[check.type]}</strong><small>{check.attentionReason || "We will guide you if more information is needed."}</small></span><b className={`is-${check.status}`}>{statuses[check.status]}</b></div>)}</div>
    <div className="brokerdesk-hold-note"><LockKeyhole aria-hidden="true" /><p><strong>Document upload is not open yet</strong><span>We are finalizing secure storage, malware scanning, and retention safeguards before accepting business documents.</span></p></div>
  </div>;
}

function StepHeading({ icon, eyebrow, title, body }: { icon: React.ReactNode; eyebrow: string; title: string; body: string }) {
  return <header className="brokerdesk-form-heading"><span>{icon}</span><div><p>{eyebrow}</p><h1>{title}</h1><div>{body}</div></div></header>;
}

function Field({ label, name, hint, optional, wide, ...input }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string; hint?: string; optional?: boolean; wide?: boolean }) {
  return <label className={`brokerdesk-field${wide ? " is-wide" : ""}`}><span>{label}{optional && <small>Optional</small>}</span><input name={name} {...input} />{hint && <small>{hint}</small>}</label>;
}

function SelectField({ label, name, options, ...select }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; name: string; options: [string,string][] }) {
  return <label className="brokerdesk-field"><span>{label}</span><select name={name} {...select}>{options.map(([key,text]) => <option value={key} key={key}>{text}</option>)}</select></label>;
}

function FormActions({ pending, primary, onBack }: { pending: boolean; primary: string; onBack?: () => void }) {
  return <div className="brokerdesk-form-actions">{onBack && <button type="button" onClick={onBack} disabled={pending} className="brokerdesk-back-button">Back</button>}<button type="submit" disabled={pending} className="brokerdesk-primary-button">{pending ? "Saving…" : primary}<ChevronRight aria-hidden="true" /></button></div>;
}
