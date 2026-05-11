import {
  Link2,
  Compass,
  MessageCircle,
  Sparkles,
  Smartphone,
  Lock,
} from "lucide-react";

const benefits = [
  {
    icon: Link2,
    title: "One link. Forever.",
    body: "Edit your biodata after your promotion, your degree, your move. The link doesn't change. Aunties don't re-download.",
  },
  {
    icon: Compass,
    title: "Your rashi. Your palette.",
    body: "Twelve rashis. Twelve color systems, sourced from Brihat Parashara Hora Shastra. Your constellation, drawn in the background.",
  },
  {
    icon: MessageCircle,
    title: "Shares on WhatsApp.",
    body: "Preview shows your name, photo, rashi. Opens cleanly in WhatsApp's browser. No “download to view.”",
  },
  {
    icon: Sparkles,
    title: "Not a Word document.",
    body: "Editorial typography. Glass surfaces. Designed to be saved, screenshotted, and shared.",
  },
  {
    icon: Smartphone,
    title: "Ten minutes on your phone.",
    body: "Nine sections. Auto-saved as you type. Photo uploads from camera roll.",
  },
  {
    icon: Lock,
    title: "Private. Expires.",
    body: "No Google. No indexing. Ninety days, then renew or let it close.",
  },
];

export function Benefits() {
  return (
    <section
      id="benefits"
      className="relative py-24 sm:py-32 px-6 sm:px-10 border-t border-[color:var(--landing-border)]"
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="landing-section-title mb-4">Why Nakshatra</p>
          <h2
            className="text-[36px] sm:text-[52px] md:text-[64px] text-[color:var(--landing-text)] leading-[1.05]"
            style={{
              fontFamily: "var(--font-harmond)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            Six reasons
            <br />
            <span className="text-[color:var(--landing-accent)] italic">
              families switch.
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {benefits.map(({ icon: Icon, title, body }, i) => (
            <article
              key={i}
              className="landing-glass p-7 sm:p-8 group hover:border-[color:var(--landing-border-strong)] transition-all duration-500 hover:-translate-y-1"
            >
              <div className="w-10 h-10 mb-6 rounded-full flex items-center justify-center bg-[color:var(--landing-accent)]/15 border border-[color:var(--landing-accent)]/30">
                <Icon
                  className="w-4 h-4 text-[color:var(--landing-accent)]"
                  strokeWidth={1.5}
                />
              </div>
              <h3
                className="text-[20px] sm:text-[22px] text-[color:var(--landing-text)] mb-3 leading-[1.15]"
                style={{
                  fontFamily: "var(--font-harmond)",
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                }}
              >
                {title}
              </h3>
              <p
                className="text-[14px] sm:text-[15px] text-[color:var(--landing-text-dim)] leading-[1.65]"
                style={{ fontFamily: "var(--font-mango)", fontWeight: 400 }}
              >
                {body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
