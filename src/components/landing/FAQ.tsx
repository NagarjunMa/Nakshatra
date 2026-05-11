import { Plus } from "lucide-react";

const faqs = [
  {
    q: "Is my biodata private?",
    a: "Yes. We don't index pages on Google. Only people with the link can view. Links expire after 90 days unless you renew.",
  },
  {
    q: "Can I update it after sending it out?",
    a: "Yes. Edit anytime. The link stays the same. Your updates appear instantly for everyone who opens it.",
  },
  {
    q: "What happens after 90 days?",
    a: "The link expires and shows a friendly message. You can renew it with one click for another 90 days.",
  },
  {
    q: "Why is the design tied to my rashi?",
    a: "Each rashi has traditional colors and a constellation. We source colors from Brihat Parashara Hora Shastra and Phaladeepika. Your biodata shows them.",
  },
  {
    q: "Can my parents help create it?",
    a: "Yes. Share your login or fill it together on one phone.",
  },
  {
    q: "How much does it cost?",
    a: "Free during launch. Paid plans for premium templates later. Your existing biodata stays free.",
  },
  {
    q: "Does it work in WhatsApp?",
    a: "Yes. Designed for WhatsApp's in-app browser. The preview shows your name, photo, and rashi.",
  },
  {
    q: "Can I delete my biodata?",
    a: "Yes. One click in the dashboard. Photo and all data removed.",
  },
  {
    q: "I live abroad. Will this work for rishtas in India?",
    a: "Yes. The link opens in any country, on any phone. Times shown in IST by default.",
  },
  {
    q: "Where is my photo stored?",
    a: "Encrypted on Supabase. Only you can edit or delete. We never share or sell.",
  },
];

export function FAQ() {
  return (
    <section
      id="faq"
      className="relative py-24 sm:py-32 px-6 sm:px-10 border-t border-[color:var(--landing-border)]"
    >
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <p className="landing-section-title mb-4">FAQ</p>
          <h2
            className="text-[36px] sm:text-[52px] md:text-[64px] text-[color:var(--landing-text)] leading-[1.05]"
            style={{
              fontFamily: "var(--font-harmond)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            Questions
            <br />
            <span className="text-[color:var(--landing-accent)] italic">
              families ask.
            </span>
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map(({ q, a }, i) => (
            <details
              key={i}
              className="landing-glass group px-6 py-5 sm:px-7 sm:py-6 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex items-start justify-between gap-4 cursor-pointer list-none">
                <span
                  className="text-[16px] sm:text-[18px] text-[color:var(--landing-text)] pr-2 leading-snug"
                  style={{
                    fontFamily: "var(--font-mango)",
                    fontWeight: 600,
                    letterSpacing: "-0.005em",
                  }}
                >
                  {q}
                </span>
                <Plus
                  className="w-5 h-5 mt-0.5 text-[color:var(--landing-accent)] shrink-0 transition-transform duration-300 group-open:rotate-45"
                  strokeWidth={1.5}
                />
              </summary>
              <p
                className="text-[14px] sm:text-[15px] text-[color:var(--landing-text-dim)] leading-[1.65] mt-4 pr-8"
                style={{ fontFamily: "var(--font-mango)" }}
              >
                {a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
