"use client";

import { useState } from "react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
    setEmail("");
  }

  return (
    <div>
      <form
        onSubmit={handleSubmit}
        className="mt-8 flex items-center gap-0 max-w-sm landing-glass overflow-hidden"
      >
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email for launch updates"
          className="flex-1 bg-transparent px-4 py-3 text-[13px] text-[color:var(--landing-text)] placeholder:text-[color:var(--landing-text-dim)] focus:outline-none"
          style={{ fontFamily: "var(--font-ranade)" }}
        />
        <button
          type="submit"
          className="px-5 py-3 text-[11px] tracking-[0.24em] uppercase text-[color:var(--landing-accent)] hover:text-white transition-colors"
          style={{ fontFamily: "var(--font-ranade)", fontWeight: 600 }}
        >
          {submitted ? "Got it" : "Notify"}
        </button>
      </form>
      <p
        className="mt-3 text-[11px] tracking-[0.2em] uppercase text-[color:var(--landing-text-dim)]"
        style={{ fontFamily: "var(--font-ranade)" }}
      >
        {submitted
          ? "Thanks. We'll email you at launch."
          : "No spam. Launch updates only."}
      </p>
    </div>
  );
}
