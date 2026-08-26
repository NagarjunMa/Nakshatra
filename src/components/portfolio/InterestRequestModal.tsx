"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, ChevronDown, MessageCircle, X } from "lucide-react";

export function InterestRequestModal({ portfolioToken, profileName }: { portfolioToken: string; profileName: string }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>("input, select, textarea, button")?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [open]);

  async function submitInterest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch("/api/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portfolioToken,
          name: formData.get("name"),
          profileFor: formData.get("profileFor"),
          phone: formData.get("phone"),
          email: formData.get("email"),
          country: formData.get("country"),
          state: formData.get("state"),
          city: formData.get("city"),
          familyContext: formData.get("familyContext"),
          message: formData.get("message"),
          portfolioUrl: formData.get("portfolioUrl"),
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to send interest");
      setSubmitted(true);
      setOpen(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to send interest");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {submitted ? (
        <div className="interest-sent" role="status">
          <CheckCircle2 aria-hidden="true" />
          <span><strong>Interest sent.</strong> You can continue viewing the portfolio.</span>
        </div>
      ) : (
        <button type="button" className="portfolio-button portfolio-button-primary" onClick={() => setOpen(true)}>
          <MessageCircle aria-hidden="true" /> Show interest
        </button>
      )}

      {open && createPortal(
        <div className="interest-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
          <div ref={dialogRef} className="interest-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <div className="interest-modal-header">
              <div>
                <p className="portfolio-eyebrow">Show interest</p>
                <h2 id={titleId}>Introduce yourself to {firstName(profileName)}&apos;s family</h2>
                <p>Start with your contact details. You can add more context if useful.</p>
              </div>
              <button type="button" className="interest-modal-close" onClick={() => setOpen(false)} aria-label="Close interest form">
                <X aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={submitInterest} className="interest-form">
              <div className="interest-form-scroll">
                <div className="interest-form-intro">
                  <strong>Contact details</strong>
                  <span>Required fields are marked *</span>
                </div>
                <div className="interest-field-grid">
                  <Field label="Your full name" name="name" autoComplete="name" required />
                  <label className="interest-field">
                    <span>Contacting for <b aria-hidden="true">*</b></span>
                    <select name="profileFor" required defaultValue="" aria-label="Contacting for">
                      <option value="" disabled>Choose one</option>
                      <option value="self">Myself</option>
                      <option value="son">My son</option>
                      <option value="daughter">My daughter</option>
                      <option value="sibling">My sibling</option>
                      <option value="relative">A relative</option>
                    </select>
                  </label>
                  <Field label="Phone number" name="phone" type="tel" autoComplete="tel" inputMode="tel" required />
                  <Field label="Email address" name="email" type="email" autoComplete="email" inputMode="email" required />
                </div>

                <details className="interest-optional">
                  <summary>
                    <span><strong>Add more details</strong><small>Location, family introduction, message or portfolio link (optional)</small></span>
                    <ChevronDown aria-hidden="true" />
                  </summary>
                  <div className="interest-optional-content">
                    <div className="interest-form-intro">
                      <strong>Location</strong>
                      <span>Optional</span>
                    </div>
                    <div className="interest-location-grid">
                      <Field label="Country" name="country" autoComplete="country-name" />
                      <Field label="State or province" name="state" autoComplete="address-level1" />
                      <Field label="City" name="city" autoComplete="address-level2" />
                    </div>
                    <div className="interest-optional-copy-grid">
                      <label className="interest-field"><span>Brief family introduction</span><textarea name="familyContext" rows={2} maxLength={600} placeholder="A short introduction about your family" /></label>
                      <label className="interest-field"><span>Message</span><textarea name="message" rows={2} maxLength={600} placeholder="Anything you would like the family to know" /></label>
                    </div>
                    <Field label="Your portfolio link" name="portfolioUrl" type="url" autoComplete="url" placeholder="https://" />
                  </div>
                </details>
                {error && <p className="interest-form-error" role="alert">{error}</p>}
              </div>
              <div className="interest-form-footer">
                <p className="interest-form-note">Only the portfolio owner receives these details.</p>
                <button type="submit" className="portfolio-button portfolio-button-primary" disabled={submitting}>
                  {submitting ? "Sending..." : "Send interest"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  autoComplete,
  inputMode,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  placeholder?: string;
}) {
  return (
    <label className="interest-field">
      <span>{label} {required && <b aria-hidden="true">*</b>}</span>
      <input aria-label={label} name={name} type={type} required={required} autoComplete={autoComplete} inputMode={inputMode} placeholder={placeholder} maxLength={type === "url" ? 500 : 180} />
    </label>
  );
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "the profile owner";
}
