import {
  Briefcase,
  CheckCircle2,
  GraduationCap,
  HeartHandshake,
  Home,
  Languages,
  LockKeyhole,
  MoonStar,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { RASHI_OPTIONS, type PortfolioData } from "@/types/portfolio";

interface EditorialMatrimonialProps {
  data: PortfolioData;
  themeColor: string;
  sunSign: string | null;
  accessMode?: "full" | "restricted";
}

export default function EditorialMatrimonial({
  data,
  themeColor,
  sunSign,
  accessMode = "full",
}: EditorialMatrimonialProps) {
  const isRestrictedMode = accessMode === "restricted";
  const isRestricted = (
    key: keyof NonNullable<PortfolioData["visibility"]>
  ) => {
    const defaultVisibility = key === "contact" ? "public" : "restricted";
    return (
      isRestrictedMode &&
      (data.visibility?.[key] ?? defaultVisibility) === "restricted"
    );
  };
  const rashiLabel = getRashiLabel(data.astrology?.rashi || sunSign);
  const heroRole = [data.career?.title, data.personal?.current_location]
    .filter(Boolean)
    .join(" • ");
  const primary = themeColor || "#031632";
  const secondary = "#775a19";

  return (
    <div
      data-template="editorial-matrimonial"
      className="min-h-screen scroll-smooth bg-[#f9f9f9] text-[#1a1c1c]"
      style={
        {
          "--portfolio-primary": primary,
          "--portfolio-secondary": secondary,
        } as React.CSSProperties
      }
    >
      <nav className="sticky top-0 z-40 border-b border-[#031632]/5 bg-white/90 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold uppercase tracking-[0.18em] text-[#031632]">
              {data.personal?.name || "Nakshatra Portfolio"}
            </p>
            {data.personal?.preferred_name && (
              <p className="mt-0.5 text-xs font-medium text-[#775a19]">
                {data.personal.preferred_name}
              </p>
            )}
          </div>
          <div className="hidden items-center gap-8 md:flex">
            <a className="text-sm font-medium text-slate-600 hover:text-[#775a19]" href="#about">
              About
            </a>
            <a className="text-sm font-medium text-slate-600 hover:text-[#775a19]" href="#family">
              Family
            </a>
            <a className="text-sm font-medium text-slate-600 hover:text-[#775a19]" href="#contact">
              Contact
            </a>
            <a
              className="rounded-md px-5 py-2 text-sm font-medium text-white transition-colors"
              href="#contact"
              style={{ backgroundColor: primary }}
            >
              {isRestrictedMode ? "Request Full Access" : "Get in Touch"}
            </a>
          </div>
        </div>
      </nav>

      <main className="pb-12">
        <section className="mx-auto mb-20 grid max-w-7xl grid-cols-1 items-center gap-12 px-6 pt-14 lg:grid-cols-2 lg:pt-20">
          <div className="order-2 space-y-8 lg:order-1">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-serif text-4xl font-bold leading-tight tracking-tight text-[#031632] lg:text-5xl">
                  {data.personal?.name || "Wedding Portfolio"}
                </h1>
                <CheckCircle2 className="h-7 w-7 shrink-0 text-[#775a19]" aria-label="Verified identity" />
              </div>
              {data.personal?.preferred_name && (
                <p className="mt-2 font-medium tracking-wide text-[#775a19]">
                  ({data.personal.preferred_name})
                </p>
              )}
            </div>

            {heroRole && (
              <div className="flex items-center gap-2 text-[#44474d]">
                <Briefcase className="h-5 w-5 text-[#775a19]" />
                <span className="font-medium">{heroRole}</span>
              </div>
            )}

            <div className="relative overflow-hidden rounded-r-xl border-l-4 border-[#775a19] bg-[#f3f3f3] p-6 shadow-[0_20px_40px_rgba(3,22,50,0.06)]">
              <MoonStar className="absolute -bottom-5 -right-5 h-28 w-28 rotate-[-15deg] text-[#031632]/5" />
              <div className="relative z-10 mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#775a19]" />
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#775a19]">
                  {rashiLabel ? `${rashiLabel} Spirit` : "Personal Story"}
                </span>
              </div>
              <p className="relative z-10 text-lg leading-relaxed text-[#44474d]">
                {data.personal?.profile_summary ||
                  data.lifestyle?.values_statement ||
                  "A thoughtful matrimonial portfolio created with Nakshatra."}
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <a
                href="#about"
                className="rounded-md px-8 py-3 text-sm font-medium text-white shadow-lg"
                style={{ backgroundColor: primary }}
              >
                Read My Journey
              </a>
              <a
                href="#contact"
                className="rounded-md border border-[#c5c6ce] px-8 py-3 text-sm font-medium text-[#031632] transition-colors hover:bg-[#f3f3f3]"
              >
                {isRestrictedMode ? "Request Full Profile" : "Connect with Family"}
              </a>
            </div>
          </div>

          <div className="order-1 flex justify-center lg:order-2 lg:justify-end">
            <div className="relative aspect-[3/4] w-full max-w-sm overflow-hidden rounded-[2rem] border-8 border-white bg-[#eeeeee] shadow-[0_20px_40px_rgba(3,22,50,0.06)] md:max-w-md">
              {data.personal?.photo_url ? (
                <div
                  className="h-full w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${data.personal.photo_url})` }}
                  role="img"
                  aria-label={data.personal.name || "Portfolio portrait"}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#f3f3f3] text-[#031632]/20">
                  <User className="h-24 w-24" />
                </div>
              )}
              <div className="pointer-events-none absolute inset-2 rounded-[1.5rem] border border-[#775a19]/20" />
            </div>
          </div>
        </section>

        <section className="bg-[#f3f3f3] px-6 py-20" id="about">
          <div className="mx-auto max-w-7xl">
            <SectionTitle title="At a Glance" />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
              <GlanceCard
                className="md:col-span-2"
                label="Born"
                value={formatBirth(data)}
                detail={data.personal?.place_of_birth}
              />
              <GlanceCard label="Height" value={data.vitals?.height} />
              <GlanceCard label="Marital Status" value={data.personal?.marital_status} />
              <GlanceCard
                className="md:col-span-2"
                label="Current Role"
                value={joinTitle(data.career?.title, data.career?.company)}
                detail={data.career?.summary || data.career?.location}
              />
              <GlanceCard
                className="md:col-span-2"
                label="Current Location"
                value={data.personal?.current_location}
                detail={data.preferences?.location_preference}
              />
              <GlanceCard
                className="md:col-span-4"
                label="Education"
                value={joinTitle(data.education?.degree, data.education?.institution)}
                detail={data.education?.location || data.education?.summary}
              />
              <GlanceCard
                className="md:col-span-2"
                label="Ancestral Origin"
                value={data.family?.ancestral_origin}
                detail={
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
              />
              <GlanceCard
                className="md:col-span-2"
                label="Relocation"
                value={data.preferences?.location_preference}
                detail="Open to the right match"
              />
            </div>

            <div className="mt-10 border-t border-[#c5c6ce]/40 pt-8">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-[#775a19]">
                Lifestyle & Languages
              </h3>
              <ChipList
                items={[
                  data.lifestyle?.diet,
                  data.lifestyle?.smoking,
                  data.lifestyle?.drinking,
                  data.lifestyle?.languages,
                ]}
                variant="muted"
              />

              <h3 className="mb-4 mt-8 text-sm font-bold uppercase tracking-[0.18em] text-[#775a19]">
                Interests & Hobbies
              </h3>
              <ChipList items={splitList(data.lifestyle?.hobbies)} />
            </div>

            {data.lifestyle?.values_statement && (
              <p className="mt-12 max-w-3xl border-l-4 border-[#775a19] pl-6 text-lg italic leading-relaxed text-[#44474d]">
                {data.lifestyle.values_statement}
              </p>
            )}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20" id="family">
          <div className="grid gap-16 lg:grid-cols-2">
            <div className="relative">
              <SectionTitle title={isRestrictedMode ? "Family Lineage" : "Family"} />
              <RestrictedPanel
                restricted={isRestricted("family")}
                title="Family Privacy Protected"
                body="Deep family background and occupational details are reserved for serious inquiries."
              >
                <TimelineItem
                  title={familyTitle("Father", data.family?.father?.name)}
                  body={data.family?.father?.occupation}
                />
                <TimelineItem
                  title={familyTitle("Mother", data.family?.mother?.name)}
                  body={data.family?.mother?.occupation}
                />
                {data.family?.siblings?.map((sibling, index) => (
                  <TimelineItem
                    key={`${sibling.name || "sibling"}-${index}`}
                    title={familyTitle("Sibling", sibling.name)}
                    body={sibling.occupation}
                  />
                ))}
                <TimelineItem
                  title="Immediate Family Location"
                  body={
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
                />
                <TimelineItem
                  title="Wider Family"
                  body={data.family?.family_spread}
                />
                {data.family?.family_note && (
                  <div className="mt-10 rounded-lg border-l-4 border-[#775a19] bg-[#eeeeee] p-6">
                    <p className="text-sm font-medium text-[#031632]">
                      {data.family.family_note}
                    </p>
                  </div>
                )}
              </RestrictedPanel>
            </div>
          </div>
        </section>

        <section className="bg-[#031632] px-6 py-20 text-white" id="horoscope">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-3">
            <div>
              <h2 className="mb-6 font-serif text-4xl font-bold">
                Astrological Alignment
              </h2>
              <p className="leading-relaxed text-[#b6c7eb]">
                Essential celestial details are provided. Deep birth chart details can be gated for secure access.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:col-span-2">
              <AstroCard label="Nakshatra" value={data.astrology?.nakshatra} />
              <AstroCard label="Rashi" value={rashiLabel} />
              <AstroCard label="Manglik Status" value={data.astrology?.manglik_status} />
              <RestrictedPanel
                restricted={isRestricted("astrology_details")}
                title="Unlock Chart"
                body="Detailed chart fields are available after secure access."
                compact
              >
                <AstroCard label="Lagnam" value={data.astrology?.lagnam} />
                <AstroCard label="Gothram" value={data.vitals?.gotra} />
                <AstroCard label="Maternal Gothram" value={data.astrology?.maternal_gotra} />
              </RestrictedPanel>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20">
          <SectionTitle title="Academic & Professional Journey" />
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <JourneyCard
              icon={<Briefcase className="h-7 w-7" />}
              title={data.career?.company}
              subtitle={data.career?.title}
              detail={data.career?.location || data.career?.summary}
              accent="#775a19"
            />
            <JourneyCard
              icon={<GraduationCap className="h-7 w-7" />}
              title={data.education?.institution}
              subtitle={data.education?.degree}
              detail={data.education?.location || data.education?.summary}
              accent="#031632"
            />
          </div>
        </section>

        {hasContent(data.preferences) && (
          <section className="bg-[#f3f3f3] px-6 py-20" id="preferences">
            <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
              <div>
                <SectionTitle title="Partner Preferences" />
                {data.preferences?.narrative && (
                  <p className="border-l-4 border-[#775a19] pl-6 text-lg italic leading-relaxed text-[#44474d]">
                    {data.preferences.narrative}
                  </p>
                )}
                <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <PreferenceCard label="Age" value={data.preferences?.age_range} />
                  <PreferenceCard label="Height" value={data.preferences?.height_range} />
                  <PreferenceCard label="Marital Status" value={data.preferences?.marital_status} />
                  <PreferenceCard label="Background" value={data.preferences?.background} />
                </div>
              </div>
              <div className="hidden aspect-square items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#1a2b48] text-center text-white/70 shadow-[0_20px_40px_rgba(3,22,50,0.06)] lg:flex">
                <div>
                  <Home className="mx-auto mb-4 h-12 w-12" />
                  <p className="text-sm italic leading-relaxed">
                    This space is reserved
                    <br />
                    for the life we build together.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="border-t border-[#c5c6ce]/30 bg-[#f3f3f3] px-6 py-20" id="contact">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="mb-4 font-serif text-4xl font-bold text-[#031632]">
              {isRestrictedMode ? "Request Full Portfolio" : "Take the Next Step"}
            </h2>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-[#44474d]">
              {data.contact?.secure_note ||
                "If values align and you would like to explore a shared future, connect securely through Nakshatra."}
            </p>

            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
              <ContactFeature
                icon={<Sparkles className="h-7 w-7" />}
                title="Complete Horoscope"
                body="Request detailed birth chart and astrological alignment."
              />
              <ContactFeature
                icon={<Users className="h-7 w-7" />}
                title="Family Background"
                body="View deeper family lineage after access is approved."
              />
              <ContactFeature
                icon={<ShieldCheck className="h-7 w-7" />}
                title="Secure Connection"
                body="All inquiries are routed with privacy in mind."
              />
            </div>

            <RestrictedPanel
              restricted={isRestricted("contact")}
              title="Direct Contact Protected"
              body="Request access to unlock direct contact details."
            >
              <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-[#c5c6ce]/30 bg-white p-8 shadow-[0_20px_40px_rgba(3,22,50,0.06)]">
                <Phone className="mx-auto mb-4 h-8 w-8 text-[#775a19]" />
                <p className="font-serif text-2xl font-bold text-[#031632]">
                  {data.contact?.contact_person || "Express Interest Securely"}
                </p>
                <p className="mt-2 text-sm text-[#44474d]">{data.contact?.phone}</p>
                <p className="text-sm text-[#44474d]">{data.contact?.email}</p>
              </div>
            </RestrictedPanel>

            <button
              className="mt-10 inline-flex w-full items-center justify-center gap-3 rounded-md px-8 py-4 text-lg font-bold text-white transition-transform active:scale-[0.98] sm:w-auto"
              style={{ backgroundColor: primary }}
              type="button"
            >
              <HeartHandshake className="h-5 w-5" />
              Express Interest Securely
            </button>
            <p className="mt-6 text-xs uppercase tracking-[0.18em] text-[#8b8d95]">
              Powered & Protected by Nakshatra
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#775a19]/20 bg-[#eeeeee] px-8 py-12 text-center">
        <p className="mb-4 font-serif text-lg italic text-[#031632]">
          The Editorial Matrimonial Portfolio
        </p>
        <p className="text-xs tracking-wide text-[#44474d]/80">
          Powered by Nakshatra
        </p>
      </footer>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="mb-12 flex items-center gap-4">
      <h2 className="font-serif text-3xl font-bold text-[#031632]">{title}</h2>
      <div className="h-px w-12 bg-[#775a19]" />
    </div>
  );
}

function GlanceCard({
  label,
  value,
  detail,
  className = "",
}: {
  label: string;
  value?: string | null;
  detail?: string | null;
  className?: string;
}) {
  if (!value && !detail) return null;

  return (
    <div className={`rounded-xl border border-[#c5c6ce]/10 bg-white p-6 shadow-[0_20px_40px_rgba(3,22,50,0.06)] ${className}`}>
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-[#775a19]">
        {label}
      </span>
      {value && <p className="font-serif text-xl text-[#031632]">{value}</p>}
      {detail && <p className="mt-1 text-sm text-[#44474d]">{detail}</p>}
    </div>
  );
}

function ChipList({
  items,
  variant = "light",
}: {
  items: Array<string | null | undefined> | string[];
  variant?: "light" | "muted";
}) {
  const values = items.flatMap((item) => splitList(item)).filter(Boolean);
  if (values.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {values.map((item, index) => (
        <span
          key={`${item}-${index}`}
          className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs font-bold tracking-wide ${
            variant === "muted"
              ? "bg-[#eeeeee] text-[#44474d]"
              : "border border-[#c5c6ce]/30 bg-white text-[#031632] shadow-[0_12px_24px_rgba(3,22,50,0.05)]"
          }`}
        >
          {variant === "muted" ? (
            <Languages className="h-4 w-4 text-[#775a19]" />
          ) : (
            <Sparkles className="h-4 w-4 text-[#775a19]" />
          )}
          {item}
        </span>
      ))}
    </div>
  );
}

function TimelineItem({
  title,
  body,
}: {
  title?: string | null;
  body?: string | null;
}) {
  if (!title && !body) return null;

  return (
    <div className="relative border-l-2 border-[#775a19]/20 pl-8">
      <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-[#775a19]" />
      {title && <h3 className="font-serif text-xl font-bold text-[#031632]">{title}</h3>}
      {body && <p className="mt-1 text-[#44474d]">{body}</p>}
    </div>
  );
}

function AstroCard({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  if (!value) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6">
      <span className="mb-2 block text-xs uppercase tracking-wide text-[#ffdea5]">
        {label}
      </span>
      <p className="font-serif text-lg">{value}</p>
    </div>
  );
}

function JourneyCard({
  icon,
  title,
  subtitle,
  detail,
  accent,
}: {
  icon: React.ReactNode;
  title?: string | null;
  subtitle?: string | null;
  detail?: string | null;
  accent: string;
}) {
  if (!title && !subtitle && !detail) return null;

  return (
    <div
      className="rounded-xl border-b-4 bg-white p-8 shadow-[0_20px_40px_rgba(3,22,50,0.06)]"
      style={{ borderBottomColor: accent }}
    >
      <div className="mb-4" style={{ color: accent }}>
        {icon}
      </div>
      {title && <h3 className="mb-2 font-serif text-xl font-bold text-[#031632]">{title}</h3>}
      {subtitle && <p className="mb-4 text-sm font-medium text-[#44474d]">{subtitle}</p>}
      {detail && <p className="text-sm leading-relaxed text-[#44474d]">{detail}</p>}
    </div>
  );
}

function PreferenceCard({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  if (!value) return null;

  return (
    <div className="rounded-lg border border-[#c5c6ce]/10 bg-white p-4 shadow-[0_16px_32px_rgba(3,22,50,0.05)]">
      <span className="mb-1 block text-xs uppercase tracking-[0.18em] text-[#775a19]">
        {label}
      </span>
      <p className="font-medium text-[#031632]">{value}</p>
    </div>
  );
}

function ContactFeature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-[#c5c6ce]/20 bg-white p-6 text-center shadow-[0_20px_40px_rgba(3,22,50,0.06)]">
      <div className="mx-auto mb-3 flex justify-center text-[#775a19]">{icon}</div>
      <h3 className="mb-2 font-serif font-bold text-[#031632]">{title}</h3>
      <p className="text-sm leading-relaxed text-[#44474d]">{body}</p>
    </div>
  );
}

function RestrictedPanel({
  restricted,
  title,
  body,
  children,
  compact = false,
}: {
  restricted: boolean;
  title: string;
  body: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  if (!restricted) {
    return (
      <div className={compact ? "contents" : "space-y-8"}>
        {children}
      </div>
    );
  }

  return (
    <div className={compact ? "relative col-span-full" : "relative"}>
      <div className={`${compact ? "grid gap-4 sm:grid-cols-2 md:grid-cols-3" : "space-y-8"} pointer-events-none select-none blur-[5px] opacity-50`}>
        {children}
      </div>
      <div className="absolute inset-0 z-10 flex items-center justify-center p-4 text-center">
        <div className="max-w-sm rounded-2xl border border-white bg-white/85 p-8 shadow-[0_20px_40px_rgba(3,22,50,0.06)] backdrop-blur-md">
          <LockKeyhole className="mx-auto mb-3 h-9 w-9 text-[#031632]" />
          <h3 className="mb-2 font-serif text-xl font-bold text-[#031632]">
            {title}
          </h3>
          <p className="mb-5 text-sm leading-relaxed text-[#44474d]">{body}</p>
          <a
            href="#contact"
            className="inline-flex w-full items-center justify-center rounded-md bg-[#031632] px-6 py-3 text-sm font-medium text-white"
          >
            Request Full Access
          </a>
        </div>
      </div>
    </div>
  );
}

function formatBirth(data: PortfolioData): string | undefined {
  const date = formatDate(data.personal?.dob);
  if (!date && !data.astrology?.time_of_birth) return undefined;
  return [date, data.astrology?.time_of_birth && `at ${data.astrology.time_of_birth}`]
    .filter(Boolean)
    .join(" ");
}

function formatDate(dateStr?: string): string | undefined {
  if (!dateStr) return undefined;
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(`${dateStr}T00:00:00`));
  } catch {
    return dateStr;
  }
}

function getRashiLabel(rashi?: string | null): string | undefined {
  if (!rashi) return undefined;
  return RASHI_OPTIONS.find((option) => option.key === rashi)?.label || rashi;
}

function joinTitle(first?: string | null, second?: string | null) {
  return [first, second].filter(Boolean).join(" at ") || undefined;
}

function familyTitle(label: string, name?: string | null) {
  if (!name) return undefined;
  return `${label}: ${name}`;
}

function splitList(value?: string | null): string[] {
  if (!value) return [];
  return value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function hasContent(obj: Record<string, unknown> | undefined): boolean {
  if (!obj) return false;
  return Object.values(obj).some(
    (value) => value !== undefined && value !== null && value !== ""
  );
}
