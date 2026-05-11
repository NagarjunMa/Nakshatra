const items = [
  {
    not: "Not a matrimony platform.",
    is: "We don't match. We make your biodata.",
  },
  {
    not: "Not an astrology calculator.",
    is: "You tell us your rashi and nakshatra.",
  },
  {
    not: "Not a PDF tool.",
    is: "Your biodata lives on the web, on one link.",
  },
  {
    not: "Not your data, ever sold.",
    is: "Privately stored. You delete anytime.",
  },
];

export function Differentiation() {
  return (
    <section className="relative py-24 sm:py-32 px-6 sm:px-10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-14">
          <p className="landing-section-title mb-4">Positioning</p>
          <h2
            className="text-[36px] sm:text-[52px] md:text-[64px] text-[color:var(--landing-text)] leading-[1.05]"
            style={{
              fontFamily: "var(--font-harmond)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            What Nakshatra
            <br />
            <span className="text-[color:var(--landing-accent)] italic">
              isn&apos;t.
            </span>
          </h2>
        </div>

        <ul className="space-y-px landing-glass overflow-hidden">
          {items.map(({ not, is }, i) => (
            <li
              key={i}
              className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-8 px-6 sm:px-8 py-6 border-b border-[color:var(--landing-border)] last:border-0"
            >
              <span
                className="text-[20px] sm:text-[24px] text-[color:var(--landing-text)] shrink-0 sm:w-72"
                style={{
                  fontFamily: "var(--font-harmond)",
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                }}
              >
                {not}
              </span>
              <span
                className="text-[15px] sm:text-[16px] text-[color:var(--landing-text-dim)] leading-relaxed"
                style={{ fontFamily: "var(--font-mango)", fontWeight: 400 }}
              >
                {is}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
