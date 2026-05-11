import { LogIn, FileEdit, Send, RefreshCw } from "lucide-react";

const steps = [
  {
    icon: LogIn,
    label: "Sign in",
    title: "One tap.",
    body: "Google or magic link. We auto-create your biodata draft. Auth handled by Supabase. No password to remember.",
  },
  {
    icon: FileEdit,
    label: "Fill the form",
    title: "Nine sections. Ten minutes.",
    body: "Personal, vitals, astrology, education, career, family, lifestyle, contact, style. Auto-saved every second. Photo uploads from your camera roll, processed server-side.",
  },
  {
    icon: Send,
    label: "Publish",
    title: "Get your link.",
    body: "One click. We generate a permanent eight-character link and pick your rashi palette. Valid for ninety days. Renewable in one click.",
  },
  {
    icon: RefreshCw,
    label: "Share. Update. Repeat.",
    title: "The link never changes.",
    body: "Forward it on WhatsApp. Edit your details whenever life changes. Your updates appear instantly for everyone who opens the link.",
  },
];

export function HowItWorks() {
  return (
    <section className="relative py-24 sm:py-32 px-6 sm:px-10 border-t border-[color:var(--landing-border)]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <p className="landing-section-title mb-4">How it works</p>
          <h2
            className="text-[36px] sm:text-[52px] md:text-[64px] text-[color:var(--landing-text)] leading-[1.05] mb-5"
            style={{
              fontFamily: "var(--font-harmond)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            Form to link in{" "}
            <span className="text-[color:var(--landing-accent)] italic">
              four steps.
            </span>
          </h2>
          <p
            className="text-[16px] text-[color:var(--landing-text-dim)] leading-relaxed"
            style={{ fontFamily: "var(--font-mango)" }}
          >
            No drafts in Google Docs. No PDFs in your downloads folder.
            Everything lives on one shareable URL.
          </p>
        </div>

        <ol className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {steps.map(({ icon: Icon, label, title, body }, i) => (
            <li
              key={i}
              className="landing-glass p-7 sm:p-8 flex flex-col gap-5 relative hover:border-[color:var(--landing-border-strong)] transition-colors duration-500"
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-[11px] tracking-[0.32em] uppercase text-[color:var(--landing-accent)]"
                  style={{ fontFamily: "var(--font-mango)", fontWeight: 600 }}
                >
                  Step {String(i + 1).padStart(2, "0")} · {label}
                </span>
                <div className="w-9 h-9 rounded-full bg-[color:var(--landing-accent)]/15 border border-[color:var(--landing-accent)]/35 flex items-center justify-center">
                  <Icon
                    className="w-4 h-4 text-[color:var(--landing-accent)]"
                    strokeWidth={1.5}
                  />
                </div>
              </div>

              <h3
                className="text-[22px] sm:text-[26px] text-[color:var(--landing-text)] leading-[1.15]"
                style={{
                  fontFamily: "var(--font-harmond)",
                  fontWeight: 600,
                  letterSpacing: "-0.015em",
                }}
              >
                {title}
              </h3>

              <p
                className="text-[14px] sm:text-[15px] text-[color:var(--landing-text-dim)] leading-[1.65]"
                style={{ fontFamily: "var(--font-mango)" }}
              >
                {body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
