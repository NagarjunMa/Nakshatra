import {
  BriefcaseBusiness,
  CalendarDays,
  GraduationCap,
  HeartHandshake,
  Home,
  Languages,
  LockKeyhole,
  MapPin,
  MoonStar,
  Phone,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react";
import { ConstellationBackdrop } from "./ConstellationBackdrop";
import { HeroPhotoSlideshow } from "./HeroPhotoSlideshow";
import type { PortfolioPhoto } from "@/features/media/portfolio-photo";
import { resolveRashiTheme } from "@/features/portfolio/rashi-theme";
import { RASHI_OPTIONS, type PortfolioData } from "@/types/portfolio";

interface RoyalHeritageProps {
  data: PortfolioData;
  themeColor: string;
  sunSign: string | null;
  accessMode?: "full" | "restricted";
  photos?: PortfolioPhoto[];
}

/**
 * Renders the Royal Heritage portfolio using the selected rashi palette and existing constellation artwork.
 * Input: portfolio data, persisted visual settings, and the viewer access mode. Output: responsive portfolio markup.
 */
export default function RoyalHeritage({
  data,
  themeColor,
  sunSign,
  accessMode = "full",
  photos = [],
}: RoyalHeritageProps) {
  const rashi = data.astrology?.rashi || sunSign;
  const theme = resolveRashiTheme({
    rashi,
    paletteId: data.style?.rashi_palette,
    backgroundColor: themeColor,
  });
  const rashiLabel = rashi
    ? RASHI_OPTIONS.find((option) => option.key === rashi)?.label
    : undefined;
  const restrictedMode = accessMode === "restricted";
  const isRestricted = (
    key: keyof NonNullable<PortfolioData["visibility"]>
  ) => restrictedMode && (data.visibility?.[key] ?? (key === "contact" ? "public" : "restricted")) === "restricted";
  const heroLine = [data.career?.title, data.personal?.current_location]
    .filter(Boolean)
    .join(" • ");

  const surface = theme.isLightBackground ? "rgba(255, 255, 255, 0.42)" : "rgba(12, 12, 15, 0.48)";
  const strongSurface = theme.isLightBackground ? "rgba(255, 255, 255, 0.68)" : "rgba(12, 12, 15, 0.72)";
  const border = theme.isLightBackground ? "rgba(23, 21, 28, 0.18)" : "rgba(255, 253, 248, 0.18)";

  return (
    <div
      data-template="royal-heritage"
      className="min-h-screen overflow-hidden font-sans"
      style={{ backgroundColor: theme.background, color: theme.foreground }}
    >
      <header
        className="sticky top-0 z-40 border-b px-5 py-3 backdrop-blur-xl"
        style={{ backgroundColor: strongSurface, borderColor: border }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <p className="font-serif text-lg font-semibold tracking-wide">Nakshatra</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: theme.accent }}>
            Royal Heritage
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-14 pt-6 sm:px-6 sm:pt-10">
        <section className="relative isolate overflow-hidden border px-5 pb-6 pt-48 sm:px-8 sm:pb-8 sm:pt-64" style={{ backgroundColor: strongSurface, borderColor: border }}>
          <ConstellationBackdrop
            constellationPath={theme.constellationPath}
            isLightBackground={theme.isLightBackground}
            className="opacity-90"
          />
          <div className="absolute inset-x-0 top-0 h-64 sm:h-80">
            {photos.length ? (
              <HeroPhotoSlideshow photos={photos} />
            ) : (
              <div className="h-full w-full" style={{ backgroundColor: theme.accent }} />
            )}
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: `linear-gradient(to bottom, transparent 25%, ${theme.background})` }}
            />
          </div>

          <div className="relative z-10 max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: theme.accent }}>
              {rashiLabel || "Matrimonial Portfolio"}
            </p>
            <h1 className="mt-2 font-serif text-4xl leading-tight sm:text-5xl">
              {data.personal?.name || "Your Name"}
            </h1>
            {data.personal?.preferred_name && (
              <p className="mt-1 text-base italic opacity-75">({data.personal.preferred_name})</p>
            )}
            {heroLine && <p className="mt-4 text-sm sm:text-base" style={{ color: theme.mutedForeground }}>{heroLine}</p>}
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium uppercase tracking-[0.1em]" style={{ color: theme.mutedForeground }}>
              {data.personal?.dob && <Meta icon={<CalendarDays className="h-3.5 w-3.5" />} value={formatDate(data.personal.dob)} />}
              {data.personal?.current_location && <Meta icon={<MapPin className="h-3.5 w-3.5" />} value={data.personal.current_location} />}
            </div>
          </div>

          {rashiLabel && (
            <div className="relative z-10 mt-6 inline-flex items-center gap-3 border px-4 py-3 backdrop-blur-md" style={{ backgroundColor: surface, borderColor: border }}>
              <MoonStar className="h-5 w-5" style={{ color: theme.accent }} />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: theme.accent }}>Rashi</p>
                <p className="font-serif text-lg leading-none">{rashiLabel}</p>
              </div>
            </div>
          )}
        </section>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <HeritageCard title="Vitals" icon={<UserRound className="h-4 w-4" />} theme={theme} surface={surface} border={border}>
            <DataPair label="Height" value={data.vitals?.height} theme={theme} />
            <DataPair label="Complexion" value={data.vitals?.complexion} theme={theme} />
            <DataPair label="Gotra" value={data.vitals?.gotra} theme={theme} />
          </HeritageCard>
          <HeritageCard title="Astrology" icon={<Sparkles className="h-4 w-4" />} theme={theme} surface={surface} border={border}>
            <DataPair label="Nakshatra" value={data.astrology?.nakshatra} theme={theme} />
            <DataPair label="Time of birth" value={data.astrology?.time_of_birth} theme={theme} />
            <RestrictedBlock restricted={isRestricted("astrology_details")} theme={theme}>
              <DataPair label="Lagnam" value={data.astrology?.lagnam} theme={theme} />
              <DataPair label="Maternal gotra" value={data.astrology?.maternal_gotra} theme={theme} />
            </RestrictedBlock>
          </HeritageCard>
        </div>

        {data.personal?.profile_summary && (
          <section className="relative mt-5 overflow-hidden border p-6 sm:p-8" style={{ backgroundColor: surface, borderColor: border }}>
            <ConstellationBackdrop constellationPath={theme.constellationPath} isLightBackground={theme.isLightBackground} />
            <p className="relative z-10 text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: theme.accent }}>Personal note</p>
            <p className="relative z-10 mt-3 max-w-3xl font-serif text-2xl leading-relaxed sm:text-3xl">{data.personal.profile_summary}</p>
          </section>
        )}

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <HeritageCard title="Education" icon={<GraduationCap className="h-4 w-4" />} theme={theme} surface={surface} border={border}>
            <DataPair label="Degree" value={data.education?.degree} theme={theme} />
            <DataPair label="Institution" value={data.education?.institution} theme={theme} />
            <DataPair label="Location" value={data.education?.location} theme={theme} />
          </HeritageCard>
          <HeritageCard title="Career" icon={<BriefcaseBusiness className="h-4 w-4" />} theme={theme} surface={surface} border={border}>
            <DataPair label="Role" value={data.career?.title} theme={theme} />
            <DataPair label="Organization" value={data.career?.company} theme={theme} />
            <DataPair label="Location" value={data.career?.location} theme={theme} />
          </HeritageCard>
        </div>

        <section className="relative mt-5 overflow-hidden border p-6 sm:p-8" style={{ backgroundColor: surface, borderColor: border }}>
          <ConstellationBackdrop constellationPath={theme.constellationPath} isLightBackground={theme.isLightBackground} />
          <div className="relative z-10 flex items-center gap-2">
            <UsersRound className="h-4 w-4" style={{ color: theme.accent }} />
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: theme.accent }}>Family heritage</h2>
          </div>
          <RestrictedBlock restricted={isRestricted("family")} theme={theme}>
            <div className="relative z-10 mt-6 grid gap-5 sm:grid-cols-2">
              <DataPair label="Father" value={familyValue(data.family?.father)} theme={theme} />
              <DataPair label="Mother" value={familyValue(data.family?.mother)} theme={theme} />
              {data.family?.siblings?.map((sibling, index) => (
                <DataPair key={`${sibling.name || "sibling"}-${index}`} label="Sibling" value={familyValue(sibling)} theme={theme} />
              ))}
              <DataPair label="Ancestral origin" value={data.family?.ancestral_origin} theme={theme} />
              <DataPair
                label="Immediate family location"
                value={
                  [
                    data.family?.current_city,
                    data.family?.current_region,
                    data.family?.current_country,
                  ]
                    .filter(Boolean)
                    .join(", ") ||
                  data.family?.parents_location ||
                  data.family?.current_settlement
                }
                theme={theme}
              />
              <DataPair label="Wider family" value={data.family?.family_spread} theme={theme} />
              <DataPair label="Family note" value={data.family?.family_note} theme={theme} />
            </div>
          </RestrictedBlock>
        </section>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <HeritageCard title="Lifestyle & interests" icon={<Languages className="h-4 w-4" />} theme={theme} surface={surface} border={border}>
            <ChipList values={[data.lifestyle?.diet, data.lifestyle?.languages, data.lifestyle?.hobbies, data.lifestyle?.music]} theme={theme} />
          </HeritageCard>
          <HeritageCard title="Partner preferences" icon={<HeartHandshake className="h-4 w-4" />} theme={theme} surface={surface} border={border}>
            <DataPair label="Age" value={data.preferences?.age_range} theme={theme} />
            <DataPair label="Location" value={data.preferences?.location_preference} theme={theme} />
            <DataPair label="Background" value={data.preferences?.background} theme={theme} />
          </HeritageCard>
        </div>

        <section className="relative mt-5 overflow-hidden border p-6 text-center sm:p-10" style={{ backgroundColor: strongSurface, borderColor: border }}>
          <ConstellationBackdrop constellationPath={theme.constellationPath} isLightBackground={theme.isLightBackground} />
          <div className="relative z-10 mx-auto max-w-xl">
            <Home className="mx-auto h-6 w-6" style={{ color: theme.accent }} />
            <h2 className="mt-3 font-serif text-3xl">A meaningful beginning</h2>
            <RestrictedBlock restricted={isRestricted("contact")} theme={theme}>
              <div className="mt-5 space-y-2">
                <DataPair label="Contact person" value={data.contact?.contact_person} theme={theme} centered />
                <DataPair label="Phone" value={data.contact?.phone} theme={theme} centered />
                <DataPair label="Email" value={data.contact?.email} theme={theme} centered />
              </div>
            </RestrictedBlock>
            {!isRestricted("contact") && data.contact?.secure_note && <p className="mt-5 text-sm leading-6" style={{ color: theme.mutedForeground }}>{data.contact.secure_note}</p>}
            <Phone className="mx-auto mt-6 h-5 w-5" style={{ color: theme.accent }} />
          </div>
        </section>
      </main>
    </div>
  );
}

/**
 * Renders a themed portfolio content card with a constellation backdrop.
 * Input: heading, icon, resolved rashi theme, surface tokens, and card content. Output: styled section markup.
 */
function HeritageCard({ title, icon, theme, surface, border, children }: { title: string; icon: React.ReactNode; theme: ReturnType<typeof resolveRashiTheme>; surface: string; border: string; children: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden border p-6" style={{ backgroundColor: surface, borderColor: border }}>
      <ConstellationBackdrop constellationPath={theme.constellationPath} isLightBackground={theme.isLightBackground} />
      <div className="relative z-10 flex items-center gap-2">
        <span style={{ color: theme.accent }}>{icon}</span>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: theme.accent }}>{title}</h2>
      </div>
      <div className="relative z-10 mt-6 grid gap-5">{children}</div>
    </section>
  );
}

/**
 * Renders one labelled portfolio value when it is available.
 * Input: label, optional value, resolved theme, and alignment preference. Output: a value pair or null.
 */
function DataPair({ label, value, theme, centered = false }: { label: string; value?: string | null; theme: ReturnType<typeof resolveRashiTheme>; centered?: boolean }) {
  if (!value) return null;
  return (
    <div className={centered ? "text-center" : ""}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: theme.accent }}>{label}</p>
      <p className="mt-1 text-base font-medium" style={{ color: theme.foreground }}>{value}</p>
    </div>
  );
}

/**
 * Renders compact hero metadata alongside its icon.
 * Input: icon node and display value. Output: inline metadata markup.
 */
function Meta({ icon, value }: { icon: React.ReactNode; value: string }) {
  return <span className="inline-flex items-center gap-1.5">{icon}{value}</span>;
}

/**
 * Splits comma, semicolon, or newline-delimited values into themed chips.
 * Input: optional text values and a resolved theme. Output: a list of readable tags.
 */
function ChipList({ values, theme }: { values: Array<string | null | undefined>; theme: ReturnType<typeof resolveRashiTheme> }) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.filter(Boolean).flatMap((value) => value!.split(/[,;\n]/)).map((value) => value.trim()).filter(Boolean).map((value) => (
        <span key={value} className="border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ borderColor: theme.accent, color: theme.foreground }}>{value}</span>
      ))}
    </div>
  );
}

/**
 * Protects restricted sections with a blurred access overlay for limited viewers.
 * Input: restriction state, resolved theme, and protected content. Output: content or obscured gated markup.
 */
function RestrictedBlock({ restricted, theme, children }: { restricted: boolean; theme: ReturnType<typeof resolveRashiTheme>; children: React.ReactNode }) {
  if (!restricted) return <>{children}</>;
  return (
    <div className="relative mt-5">
      <div className="pointer-events-none select-none blur-[5px] opacity-45">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center p-3 text-center">
        <div className="border px-4 py-3 backdrop-blur-md" style={{ backgroundColor: theme.background, borderColor: theme.accent }}>
          <LockKeyhole className="mx-auto h-4 w-4" style={{ color: theme.accent }} />
          <p className="mt-2 text-xs font-semibold" style={{ color: theme.foreground }}>Details shared after approval</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Formats one family member for compact presentation.
 * Input: an optional name and occupation record. Output: a display string or undefined.
 */
function familyValue(member?: { name?: string; occupation?: string }) {
  if (!member?.name) return undefined;
  return member.occupation ? `${member.name} - ${member.occupation}` : member.name;
}

/**
 * Formats an ISO calendar date without shifting it across time zones.
 * Input: YYYY-MM-DD date string. Output: localized Indian-English display date.
 */
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}
