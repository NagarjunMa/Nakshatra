"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, CheckCircle2, ChevronDown, MailCheck, MessageCircle, ShieldCheck, X } from "lucide-react";
import { startAuthentication, verifyAuthenticationCode } from "@/features/auth/client/auth.api";

type ModalStep = "details" | "verify" | "success";
type InterestPayload = {
  portfolioToken: string;
  name: FormDataEntryValue | null;
  profileFor: FormDataEntryValue | null;
  phone: FormDataEntryValue | null;
  email: string;
  country: FormDataEntryValue | null;
  state: FormDataEntryValue | null;
  city: FormDataEntryValue | null;
  familyContext: FormDataEntryValue | null;
  message: FormDataEntryValue | null;
  portfolioUrl: FormDataEntryValue | null;
};

export function InterestRequestModal({ portfolioToken, profileName, authenticated, verifiedEmail, isOwner = false }: {
  portfolioToken: string;
  profileName: string;
  authenticated: boolean;
  verifiedEmail?: string | null;
  isOwner?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<ModalStep>("details");
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState(verifiedEmail || "");
  const [otp, setOtp] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const [requestPayload, setRequestPayload] = useState<InterestPayload | null>(null);
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const portfolioPath = `/p/${encodeURIComponent(portfolioToken)}`;
  const sessionEmail = authenticated ? verifiedEmail?.trim().toLowerCase() || null : null;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>("input, select, textarea, button")?.focus();

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") return setOpen(false);
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href]'
      ));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  useEffect(() => {
    if (step !== "success") return;
    const timer = window.setTimeout(() => setOpen(false), 1800);
    return () => window.clearTimeout(timer);
  }, [step]);

  function closeModal() {
    if (!pending) setOpen(false);
  }

  async function beginRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const enteredEmail = String(formData.get("email") || "").trim().toLowerCase();
    const payload: InterestPayload = {
      portfolioToken,
      name: formData.get("name"),
      profileFor: formData.get("profileFor"),
      phone: formData.get("phone"),
      email: sessionEmail || enteredEmail,
      country: formData.get("country"),
      state: formData.get("state"),
      city: formData.get("city"),
      familyContext: formData.get("familyContext"),
      message: formData.get("message"),
      portfolioUrl: formData.get("portfolioUrl"),
    };
    setRequestPayload(payload);
    setEmail(payload.email);
    setError("");
    setPending(true);

    if (sessionEmail) return void await sendInterest(payload);

    const { ok, body } = await startAuthentication({ method: "email_otp", email: enteredEmail, redirect: portfolioPath });
    if (!ok || !body?.sent) {
      setError(body?.error || "We could not send the verification code. Please try again.");
      setPending(false);
      return;
    }
    setOtp("");
    setResendSeconds(60);
    setStep("verify");
    setPending(false);
  }

  async function verifyAndSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requestPayload) return setStep("details");
    setPending(true);
    setError("");
    const { ok, body } = await verifyAuthenticationCode({ purpose: "viewer_interest", email, token: otp, redirect: portfolioPath });
    if (!ok || !body?.verified) {
      setError(body?.error || "That code is incorrect or has expired.");
      setPending(false);
      return;
    }
    await sendInterest({ ...requestPayload, email: body.email || email });
  }

  async function resendCode() {
    if (resendSeconds > 0 || pending) return;
    setPending(true);
    setError("");
    const { ok, body } = await startAuthentication({ method: "email_otp", email, redirect: portfolioPath });
    if (!ok || !body?.sent) setError(body?.error || "We could not send another code.");
    else setResendSeconds(60);
    setPending(false);
  }

  async function sendInterest(payload: InterestPayload) {
    try {
      const response = await fetch("/api/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (response.status === 401) {
        setStep("verify");
        setError("Your verification session ended. Send a new code and try again.");
        return;
      }
      if (!response.ok) throw new Error(result?.error || "Unable to send interest");
      setSubmitted(true);
      setStep("success");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to send interest");
    } finally {
      setPending(false);
    }
  }

  function openModal() {
    if (isOwner) return;
    setError("");
    setStep("details");
    setOtp("");
    setEmail(sessionEmail || "");
    setOpen(true);
  }

  return (
    <>
      {submitted ? (
        <div className="interest-sent" role="status"><CheckCircle2 aria-hidden="true" /><span><strong>Interest sent.</strong> You can continue viewing the portfolio.</span></div>
      ) : isOwner ? (
        <div className="interest-owner-action">
          <button type="button" className="portfolio-button portfolio-button-primary" disabled aria-describedby="own-portfolio-interest-note"><MessageCircle aria-hidden="true" /> Show interest</button>
          <span id="own-portfolio-interest-note">This is your portfolio.</span>
        </div>
      ) : (
        <button type="button" className="portfolio-button portfolio-button-primary" onClick={openModal}><MessageCircle aria-hidden="true" /> Show interest</button>
      )}

      {open && createPortal(
        <div className="interest-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && closeModal()}>
          <div ref={dialogRef} className="interest-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <div className="interest-modal-header">
              <div>
                <p className="portfolio-eyebrow">Show interest</p>
                <h2 id={titleId}>{step === "verify" ? "Verify your email" : step === "success" ? "Interest sent" : `Introduce yourself to ${firstName(profileName)}'s family`}</h2>
                <p>{step === "verify" ? "Enter the six-digit code we sent. Your details will be submitted after verification." : step === "success" ? "The portfolio owner can now review your request." : "Start with your contact details. You can add more context if useful."}</p>
              </div>
              <button type="button" className="interest-modal-close" onClick={closeModal} aria-label="Close interest form"><X aria-hidden="true" /></button>
            </div>

            {step === "details" && <DetailsForm sessionEmail={sessionEmail} pending={pending} error={error} onSubmit={beginRequest} />}

            {step === "verify" && (
              <form className="interest-verification" onSubmit={verifyAndSend}>
                <div className="interest-verification-icon"><ShieldCheck aria-hidden="true" /></div>
                <p>Code sent to</p><strong>{email}</strong>
                <label className="interest-code-field" htmlFor="interest-code">
                  <span>Six-digit code</span>
                  <input id="interest-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} required autoFocus />
                </label>
                {error && <p className="interest-form-error" role="alert">{error}</p>}
                <button type="submit" className="portfolio-button portfolio-button-primary" disabled={pending || otp.length !== 6}>{pending ? "Verifying..." : "Confirm and send interest"}</button>
                <button type="button" className="interest-secondary-action" onClick={() => void resendCode()} disabled={pending || resendSeconds > 0}>{resendSeconds > 0 ? `Send another code in ${resendSeconds}s` : "Send another code"}</button>
                <button type="button" className="interest-secondary-action" onClick={() => { setError(""); setStep("details"); }} disabled={pending}><ArrowLeft aria-hidden="true" /> Change details</button>
              </form>
            )}

            {step === "success" && (
              <div className="interest-success" role="status">
                <CheckCircle2 aria-hidden="true" />
                <h3>Interest sent to {firstName(profileName)}&apos;s family.</h3>
                <p>This window will close and return you to the portfolio.</p>
                <button type="button" className="portfolio-button portfolio-button-primary" onClick={closeModal}>Return to portfolio</button>
              </div>
            )}
          </div>
        </div>, document.body
      )}
    </>
  );
}

function DetailsForm({ sessionEmail, pending, error, onSubmit }: {
  sessionEmail: string | null;
  pending: boolean;
  error: string;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="interest-form">
      <div className="interest-form-scroll">
        <div className="interest-form-intro"><strong>Contact details</strong><span>Required fields are marked *</span></div>
        <div className="interest-field-grid">
          <Field label="Your full name" name="name" autoComplete="name" required />
          <label className="interest-field">
            <span>Contacting for <b aria-hidden="true">*</b></span>
            <select name="profileFor" required defaultValue="" aria-label="Contacting for">
              <option value="" disabled>Choose one</option><option value="self">Myself</option><option value="son">My son</option><option value="daughter">My daughter</option><option value="sibling">My sibling</option><option value="relative">A relative</option>
            </select>
          </label>
          <Field label="Phone number" name="phone" type="tel" autoComplete="tel" inputMode="tel" required />
          <label className="interest-field">
            <span>Email address <b aria-hidden="true">*</b></span>
            <div className={sessionEmail ? "interest-verified-input" : undefined}>
              <input aria-label="Email address" name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={sessionEmail || ""} readOnly={Boolean(sessionEmail)} maxLength={180} />
              {sessionEmail && <MailCheck aria-label="Email verified" />}
            </div>
            {sessionEmail && <small className="interest-verified-copy">Verified email</small>}
          </label>
        </div>
        <details className="interest-optional">
          <summary><span><strong>Add more details</strong><small>Location, family introduction, message or portfolio link (optional)</small></span><ChevronDown aria-hidden="true" /></summary>
          <div className="interest-optional-content">
            <div className="interest-form-intro"><strong>Location</strong><span>Optional</span></div>
            <div className="interest-location-grid"><Field label="Country" name="country" autoComplete="country-name" /><Field label="State or province" name="state" autoComplete="address-level1" /><Field label="City" name="city" autoComplete="address-level2" /></div>
            <div className="interest-optional-copy-grid">
              <label className="interest-field"><span>Brief family introduction</span><textarea name="familyContext" rows={2} maxLength={600} placeholder="A short introduction about your family" /></label>
              <label className="interest-field"><span>Message</span><textarea name="message" rows={2} maxLength={600} placeholder="Anything you would like the family to know" /></label>
            </div>
            <Field
              label="Your portfolio link"
              name="portfolioUrl"
              type="url"
              autoComplete="url"
              placeholder="https://"
              pattern="https://.*"
              title="Use a secure link beginning with https://"
            />
          </div>
        </details>
        {error && <p className="interest-form-error" role="alert">{error}</p>}
      </div>
      <div className="interest-form-footer">
        <p className="interest-form-note">Your phone is contact information only. We verify your email before sending.</p>
        <button type="submit" className="portfolio-button portfolio-button-primary" disabled={pending}>{pending ? "Please wait..." : sessionEmail ? "Send interest" : "Verify email and continue"}</button>
      </div>
    </form>
  );
}

function Field({ label, name, type = "text", required = false, autoComplete, inputMode, placeholder, pattern, title }: {
  label: string; name: string; type?: string; required?: boolean; autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]; placeholder?: string;
  pattern?: string; title?: string;
}) {
  return <label className="interest-field"><span>{label} {required && <b aria-hidden="true">*</b>}</span><input aria-label={label} name={name} type={type} required={required} autoComplete={autoComplete} inputMode={inputMode} placeholder={placeholder} pattern={pattern} title={title} maxLength={type === "url" ? 500 : 180} /></label>;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "the profile owner";
}
