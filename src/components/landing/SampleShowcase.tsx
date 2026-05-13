import { Star } from "lucide-react";
import { Reveal } from "./Reveal";

type Sample = {
  name: string;
  initial: string;
  rashi: string;
  nakshatra: string;
  templateName: string;
  bg: string;
  cardBg: string;
  accent: string;
  textTint: string;
  font: string;
};

const samples: Sample[] = [
  {
    name: "Priya Sharma",
    initial: "P",
    rashi: "Mesha Rashi",
    nakshatra: "Ashwini",
    templateName: "Crimson Fire",
    bg: "linear-gradient(160deg, #2a0d10 0%, #140607 100%)",
    cardBg: "rgba(255, 226, 198, 0.04)",
    accent: "#e26a5a",
    textTint: "#ffe2c6",
    font: "var(--font-hkgrotesk)",
  },
  {
    name: "Ananya Iyer",
    initial: "A",
    rashi: "Simha Rashi",
    nakshatra: "Magha",
    templateName: "Royal Heritage",
    bg: "linear-gradient(160deg, #1a160a 0%, #0b0905 100%)",
    cardBg: "rgba(216, 200, 164, 0.05)",
    accent: "#d8c8a4",
    textTint: "#f5e9c6",
    font: "var(--font-hkgrotesk)",
  },
  {
    name: "Kavya Menon",
    initial: "K",
    rashi: "Tula Rashi",
    nakshatra: "Chitra",
    templateName: "Celestial Union",
    bg: "linear-gradient(160deg, #0f0f24 0%, #07071a 100%)",
    cardBg: "rgba(203, 190, 255, 0.05)",
    accent: "#8676c4",
    textTint: "#cbbeff",
    font: "var(--font-hkgrotesk)",
  },
  {
    name: "Meera Joshi",
    initial: "M",
    rashi: "Kumbha Rashi",
    nakshatra: "Shatabhisha",
    templateName: "Sapphire Sky",
    bg: "linear-gradient(160deg, #0a1426 0%, #050a18 100%)",
    cardBg: "rgba(176, 207, 255, 0.05)",
    accent: "#6f9aff",
    textTint: "#cfdfff",
    font: "var(--font-hkgrotesk)",
  },
];

export function SampleShowcase() {
  return (
    <section
      id="sample"
      className="relative py-24 sm:py-32 px-6 sm:px-10"
    >
      <Reveal stagger={0.1}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14 max-w-2xl mx-auto reveal">
          <p className="landing-section-title mb-4">Templates</p>
          <h2
            className="text-[36px] sm:text-[48px] md:text-[60px] text-[color:var(--landing-text)] leading-[1.05] mb-5"
            style={{
              fontFamily: "var(--font-hkgrotesk)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            Your rashi{" "}
            <span className="text-[color:var(--landing-accent)] italic">
              picks the palette.
            </span>
          </h2>
          <p
            className="text-[15px] sm:text-[16px] text-[color:var(--landing-text-dim)] leading-relaxed"
            style={{ fontFamily: "var(--font-ranade)" }}
          >
            Tell us your moon sign. We give you four directions, each rooted in
            its own colour tradition and constellation. No two biodatas look
            alike. None feel like a Word document.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {samples.map((sample) => (
            <MiniTemplate key={sample.name} sample={sample} />
          ))}
        </div>
      </div>
      </Reveal>
    </section>
  );
}

function MiniTemplate({ sample }: { sample: Sample }) {
  return (
    <div className="reveal group relative">
      <div
        className="absolute -inset-2 opacity-0 group-hover:opacity-30 blur-2xl rounded-3xl transition-opacity duration-500 pointer-events-none"
        style={{ backgroundColor: sample.accent }}
      />

      <div
        className="relative rounded-2xl border border-white/8 overflow-hidden aspect-[3/4] flex flex-col transition-transform duration-500 group-hover:-translate-y-1"
        style={{ background: sample.bg }}
      >
        <div className="flex-1 px-4 pt-6 pb-4 flex flex-col items-center text-center">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
            style={{
              background: sample.cardBg,
              border: `1px solid ${sample.accent}40`,
              boxShadow: `0 0 24px -8px ${sample.accent}80`,
            }}
          >
            <span
              className="text-xl"
              style={{ fontFamily: sample.font, color: sample.textTint }}
            >
              {sample.initial}
            </span>
          </div>

          <h3
            className="text-[15px] sm:text-[17px] mb-1.5 text-white"
            style={{
              fontFamily: sample.font,
              fontWeight: 600,
              letterSpacing: "-0.01em",
            }}
          >
            {sample.name}
          </h3>

          <p
            className="text-[8px] tracking-[0.28em] uppercase mb-3"
            style={{
              fontFamily: "var(--font-ranade)",
              color: sample.accent,
            }}
          >
            {sample.rashi} · {sample.nakshatra}
          </p>

          <div
            className="w-8 h-px"
            style={{ backgroundColor: `${sample.accent}80` }}
          />

          <div
            className="mt-4 w-full space-y-1.5 text-[10px]"
            style={{ fontFamily: "var(--font-ranade)" }}
          >
            <Row k="DOB" v="1995" accent={sample.accent} />
            <Row k="Place" v="Mumbai" accent={sample.accent} />
            <Row k="Height" v={`5'6"`} accent={sample.accent} />
          </div>
        </div>

        <div
          className="px-4 py-3 border-t flex items-center justify-between"
          style={{
            borderColor: `${sample.accent}20`,
            background: "rgba(0,0,0,0.25)",
          }}
        >
          <span
            className="flex items-center gap-1.5 text-[8px] tracking-[0.24em] uppercase"
            style={{
              fontFamily: "var(--font-ranade)",
              color: sample.accent,
            }}
          >
            <Star className="w-2.5 h-2.5" strokeWidth={1.5} />
            {sample.templateName}
          </span>
        </div>
      </div>
    </div>
  );
}

function Row({
  k,
  v,
  accent,
}: {
  k: string;
  v: string;
  accent: string;
}) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span style={{ color: `${accent}aa` }} className="uppercase tracking-[0.18em] text-[8px]">
        {k}
      </span>
      <span className="text-white/85 text-[10px]">{v}</span>
    </div>
  );
}
