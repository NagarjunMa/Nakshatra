import { Star, Quote, BookOpen, GraduationCap, Briefcase, Users } from "lucide-react";

export function SampleShowcase() {
  return (
    <section
      id="sample"
      className="relative py-24 sm:py-32 px-6 sm:px-10"
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <p className="landing-section-title mb-4">The output</p>
          <h2
            className="text-[40px] sm:text-[56px] md:text-[68px] text-[color:var(--landing-text)] leading-[1.05] mb-5"
            style={{
              fontFamily: "var(--font-harmond)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            Open the link.{" "}
            <span className="text-[color:var(--landing-accent)] italic">
              This is what they see.
            </span>
          </h2>
          <p
            className="text-[15px] sm:text-[16px] text-[color:var(--landing-text-dim)] leading-relaxed"
            style={{ fontFamily: "var(--font-mango)" }}
          >
            A live biodata, rendered in our CelestialUnion template. Glass
            cards on midnight. Your name in editorial type. Your rashi&apos;s
            constellation drawn in the background. Built in ten minutes from
            your phone.
          </p>
        </div>

        <div className="relative max-w-sm mx-auto">
          <div className="absolute -inset-6 bg-[color:var(--landing-accent)] opacity-20 blur-3xl rounded-full pointer-events-none" />

          <div className="relative landing-glass-strong p-3 rounded-[36px]">
            <div className="bg-[#0a0a1a] rounded-[28px] overflow-hidden">
              <div className="px-6 py-10 text-center border-b border-white/5">
                <div className="w-24 h-24 mx-auto rounded-full mb-5 ring-2 ring-[color:var(--landing-accent)]/60 bg-gradient-to-br from-[color:var(--landing-accent)]/40 to-[color:var(--landing-bg)]/60 flex items-center justify-center">
                  <span
                    className="text-3xl text-white/80"
                    style={{ fontFamily: "var(--font-harmond)" }}
                  >
                    P
                  </span>
                </div>
                <h3
                  className="text-[28px] text-white mb-2"
                  style={{
                    fontFamily: "var(--font-harmond)",
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                  }}
                >
                  Priya Sharma
                </h3>
                <p
                  className="text-[10px] tracking-[0.32em] uppercase text-[color:var(--landing-accent)]/90"
                  style={{ fontFamily: "var(--font-mango)" }}
                >
                  Mesha Rashi · Ashwini
                </p>
                <div className="mt-5 w-12 h-px bg-[color:var(--landing-accent)] mx-auto" />
              </div>

              <SampleCard
                icon={<Star className="w-3 h-3" strokeWidth={1.5} />}
                label="Personal"
              >
                <Row k="DOB" v="15 March 1995" />
                <Row k="Place" v="Mumbai, MH" />
                <Row k="Height" v={`5'6"`} />
              </SampleCard>

              <SampleCard
                icon={<BookOpen className="w-3 h-3" strokeWidth={1.5} />}
                label="Astrology"
              >
                <Row k="Rashi" v="Mesha" />
                <Row k="Nakshatra" v="Ashwini · 2nd pada" />
                <Row k="Time" v="6:42 AM" />
              </SampleCard>

              <SampleCard
                icon={<GraduationCap className="w-3 h-3" strokeWidth={1.5} />}
                label="Education"
              >
                <Row k="Degree" v="B.Tech, Computer Science" />
                <Row k="Institution" v="IIT Bombay · 2017" />
              </SampleCard>

              <SampleCard
                icon={<Briefcase className="w-3 h-3" strokeWidth={1.5} />}
                label="Career"
              >
                <Row k="Title" v="Senior Engineer" />
                <Row k="Company" v="Razorpay" />
              </SampleCard>

              <SampleCard
                icon={<Users className="w-3 h-3" strokeWidth={1.5} />}
                label="Family"
              >
                <Row k="Father" v="Ramesh · Architect" />
                <Row k="Mother" v="Sunita · Teacher" />
              </SampleCard>

              <div className="px-6 py-6 text-center">
                <p
                  className="text-[9px] tracking-[0.4em] uppercase text-white/30"
                  style={{ fontFamily: "var(--font-mango)" }}
                >
                  Created with Nakshatra
                </p>
              </div>
            </div>
          </div>

          <Quote
            className="absolute -top-6 -left-6 w-12 h-12 text-[color:var(--landing-accent)]/30"
            strokeWidth={1}
          />
        </div>
      </div>
    </section>
  );
}

function SampleCard({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-5 py-5 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-2 mb-3 text-[color:var(--landing-accent)]/90">
        {icon}
        <span
          className="text-[10px] tracking-[0.32em] uppercase"
          style={{ fontFamily: "var(--font-mango)", fontWeight: 600 }}
        >
          {label}
        </span>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between text-[13px]">
      <span
        className="text-white/40"
        style={{ fontFamily: "var(--font-mango)", fontWeight: 400 }}
      >
        {k}
      </span>
      <span
        className="text-white/85"
        style={{ fontFamily: "var(--font-mango)", fontWeight: 500 }}
      >
        {v}
      </span>
    </div>
  );
}
