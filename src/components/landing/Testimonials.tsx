import { Quote } from "lucide-react";
import { Reveal } from "./Reveal";

const quotes = [
  {
    text: "Updated my biodata after my promotion. Same link. The aunties didn't even notice.",
    name: "Priya",
    meta: "27 · Bangalore",
  },
  {
    text: "My mother stopped forwarding Word documents. That alone was worth it.",
    name: "Arjun",
    meta: "31 · Hyderabad",
  },
  {
    text: "The Ashwini detail on my biodata? My panditji noticed before I did.",
    name: "Vikram",
    meta: "28 · Mumbai",
  },
  {
    text: "Forwarded my daughter's link to fifteen relatives. Not one asked for an updated copy when she added her MBA.",
    name: "Mrs. Sharma",
    meta: "Bangalore",
  },
  {
    text: "Sent it to a rishta family in Toronto. Looked stunning on her phone.",
    name: "Rohan",
    meta: "29 · Pune",
  },
  {
    text: "The Mesha constellation in the background. My grandmother smiled when she saw it.",
    name: "Kavya",
    meta: "26 · Chennai",
  },
];

export function Testimonials() {
  return (
    <section className="relative py-24 sm:py-32 px-6 sm:px-10">
      <Reveal>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 reveal">
          <p className="landing-section-title mb-4">Voices</p>
          <h2
            className="text-[32px] sm:text-[52px] md:text-[64px] text-[color:var(--landing-text)] leading-[1.05]"
            style={{
              fontFamily: "var(--font-hkgrotesk)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            From the families
            <br />
            <span className="text-[color:var(--landing-accent)] italic">
              using it.
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {quotes.map(({ text, name, meta }, i) => (
            <figure
              key={i}
              className="reveal landing-glass p-7 sm:p-8 flex flex-col gap-5 hover:border-[color:var(--landing-border-strong)] transition-all hover:-translate-y-1 duration-500"
            >
              <Quote
                className="w-6 h-6 text-[color:var(--landing-accent)]/40"
                strokeWidth={1.5}
              />
              <blockquote
                className="text-[16px] sm:text-[17px] leading-[1.55] text-[color:var(--landing-text)]"
                style={{ fontFamily: "var(--font-ranade)", fontWeight: 400 }}
              >
                {`“${text}”`}
              </blockquote>
              <figcaption className="mt-auto pt-4 border-t border-[color:var(--landing-border)]">
                <div
                  className="text-[14px] text-[color:var(--landing-text)]"
                  style={{
                    fontFamily: "var(--font-hkgrotesk)",
                    fontWeight: 600,
                  }}
                >
                  {name}
                </div>
                <div
                  className="text-[11px] tracking-[0.22em] uppercase text-[color:var(--landing-text-dim)] mt-0.5"
                  style={{ fontFamily: "var(--font-ranade)" }}
                >
                  {meta}
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
      </Reveal>
    </section>
  );
}
