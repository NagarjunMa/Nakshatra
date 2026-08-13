"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CheckCircle2, MessageCircle, X } from "lucide-react";

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
    dialogRef.current?.querySelector<HTMLElement>("input, select, textarea, button")?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
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
          location: formData.get("location"),
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

      {open && (
        <div className="interest-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
          <div ref={dialogRef} className="interest-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <div className="interest-modal-header">
              <div>
                <p className="portfolio-eyebrow">Show interest</p>
                <h2 id={titleId}>Introduce yourself to {firstName(profileName)}&apos;s family.</h2>
                <p>Share a few details so they understand who is reaching out.</p>
              </div>
              <button type="button" className="interest-modal-close" onClick={() => setOpen(false)} aria-label="Close interest form">
                <X aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={submitInterest} className="interest-form">
              <div className="interest-field-grid">
                <Field label="Your full name" name="name" required />
                <label className="interest-field">Contacting for<select name="profileFor" required defaultValue=""><option value="" disabled>Choose one</option><option value="self">Self</option><option value="son">Son</option><option value="daughter">Daughter</option><option value="sibling">Sibling</option><option value="relative">Relative</option></select></label>
                <Field label="Phone number" name="phone" type="tel" required />
                <Field label="Email address" name="email" type="email" required />
              </div>
              <Field label="City and country" name="location" required />
              <label className="interest-field">Brief family introduction<textarea name="familyContext" rows={3} required maxLength={600} /></label>
              <label className="interest-field">Message<textarea name="message" rows={3} required maxLength={600} /></label>
              <Field label="Your portfolio link (optional)" name="portfolioUrl" type="url" />
              <p className="interest-form-note">These details are sent to the portfolio owner only for this request.</p>
              {error && <p className="interest-form-error" role="alert">{error}</p>}
              <button type="submit" className="portfolio-button portfolio-button-primary" disabled={submitting}>
                {submitting ? "Sending..." : "Send interest"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, name, type = "text", required = false }: { label: string; name: string; type?: string; required?: boolean }) {
  return <label className="interest-field">{label}<input name={name} type={type} required={required} maxLength={type === "url" ? 500 : 180} /></label>;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "the profile owner";
}
