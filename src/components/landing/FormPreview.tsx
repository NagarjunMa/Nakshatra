const steps = [
  {
    label: "Personal",
    detail: "Name, photo, place, date of birth",
  },
  {
    label: "Astrology",
    detail: "Rashi, nakshatra, time of birth",
  },
  {
    label: "Family",
    detail: "Father, mother, siblings",
  },
  {
    label: "Education + Career",
    detail: "Where you studied, what you do",
  },
  {
    label: "Lifestyle",
    detail: "Hobbies, languages, food",
  },
  {
    label: "Contact",
    detail: "How families reach you",
  },
];

export function FormPreview() {
  return (
    <section className="relative py-24 sm:py-32 px-6 sm:px-10 border-t border-[color:var(--landing-border)]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="landing-section-title mb-4">The form</p>
          <h2
            className="text-[36px] sm:text-[52px] md:text-[64px] text-[color:var(--landing-text)] leading-[1.05]"
            style={{
              fontFamily: "var(--font-harmond)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            What you&apos;ll
            <br />
            <span className="text-[color:var(--landing-accent)] italic">
              fill.
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {steps.map(({ label, detail }, i) => (
            <div
              key={i}
              className="flex items-baseline gap-5 landing-glass px-6 py-5 hover:border-[color:var(--landing-border-strong)] transition-colors"
            >
              <span
                className="text-[28px] text-[color:var(--landing-accent)]/70 shrink-0 tabular-nums"
                style={{
                  fontFamily: "var(--font-harmond)",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <h3
                  className="text-[17px] sm:text-[18px] text-[color:var(--landing-text)]"
                  style={{
                    fontFamily: "var(--font-mango)",
                    fontWeight: 600,
                    letterSpacing: "-0.005em",
                  }}
                >
                  {label}
                </h3>
                <p
                  className="text-[13px] sm:text-[14px] text-[color:var(--landing-text-dim)] mt-0.5"
                  style={{ fontFamily: "var(--font-mango)" }}
                >
                  {detail}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p
          className="text-center mt-12 text-[12px] tracking-[0.32em] uppercase text-[color:var(--landing-text-dim)]"
          style={{ fontFamily: "var(--font-mango)" }}
        >
          Nine sections · Ten minutes · Save as you go
        </p>
      </div>
    </section>
  );
}
