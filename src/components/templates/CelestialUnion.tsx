import {
  User,
  Heart,
  Star,
  GraduationCap,
  Briefcase,
  Users,
  Music,
  Phone,
  LockKeyhole,
} from "lucide-react";
import Image from "next/image";
import { RASHI_OPTIONS, type PortfolioData } from "@/types/portfolio";

interface CelestialUnionProps {
  data: PortfolioData;
  themeColor: string;
  sunSign: string | null;
  accessMode?: "full" | "restricted";
}

export default function CelestialUnion({
  data,
  themeColor,
  sunSign,
  accessMode = "full",
}: CelestialUnionProps) {
  const constellationUrl = sunSign ? `/constellations/${sunSign}.svg` : null;
  const rashiLabel = sunSign
    ? RASHI_OPTIONS.find((r) => r.key === sunSign)?.label
    : null;
  const showRestricted = accessMode === "restricted";
  const isSectionRestricted = (
    key: keyof NonNullable<PortfolioData["visibility"]>
  ) => {
    const defaultVisibility =
      key === "contact" ? "public" : "restricted";
    return (
      showRestricted &&
      (data.visibility?.[key] ?? defaultVisibility) === "restricted"
    );
  };
  const heroLine = [data.career?.title, data.personal?.current_location]
    .filter(Boolean)
    .join(" • ");

  return (
    <div
      data-template="celestial-union"
      className="relative min-h-screen overflow-hidden bg-[#0a0a1a] text-white font-sans"
      style={{ "--theme-color": themeColor } as React.CSSProperties}
    >
      {/* Constellation background */}
      {constellationUrl && (
        <div
          data-constellation-bg
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{ color: themeColor }}
        >
          <Image
            src={constellationUrl}
            alt=""
            width={600}
            height={600}
            unoptimized
            className="absolute -right-[5%] top-[8%] h-[55%] w-auto"
          />
          <Image
            src={constellationUrl}
            alt=""
            width={600}
            height={600}
            unoptimized
            className="absolute -left-[8%] bottom-[5%] h-[40%] w-auto rotate-180 opacity-60"
          />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-xl px-5 py-10 sm:py-16">
        {/* Hero */}
        <div className="flex flex-col items-center text-center">
          {data.personal?.photo_url ? (
            <Image
              src={data.personal.photo_url}
              alt={data.personal.name}
              width={176}
              height={176}
              sizes="(min-width: 640px) 176px, 144px"
              className="h-36 w-36 rounded-full object-cover sm:h-44 sm:w-44"
              style={{
                boxShadow: `0 0 0 3px ${themeColor}, 0 0 30px ${themeColor}20`,
              }}
            />
          ) : (
            <div
              className="flex h-36 w-36 items-center justify-center rounded-full bg-white/[0.06] sm:h-44 sm:w-44"
              style={{ boxShadow: `0 0 0 3px ${themeColor}40` }}
            >
              <User className="h-16 w-16 text-white/20" />
            </div>
          )}

          <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
            {data.personal?.name}
          </h1>

          {data.personal?.preferred_name && (
            <p
              className="mt-1 text-sm font-medium"
              style={{ color: themeColor }}
            >
              ({data.personal.preferred_name})
            </p>
          )}

          {heroLine && (
            <p className="mt-3 text-sm font-medium text-white/70">
              {heroLine}
            </p>
          )}

          {rashiLabel && (
            <p
              className="mt-2 text-sm font-medium uppercase tracking-[0.15em] opacity-80"
              style={{ color: themeColor }}
            >
              {rashiLabel}
              {data.astrology?.nakshatra && ` · ${data.astrology.nakshatra}`}
            </p>
          )}

          {/* Divider */}
          <div
            className="mx-auto mt-6 mb-10 h-[2px] w-16"
            style={{ backgroundColor: themeColor, opacity: 0.4 }}
          />
        </div>

        {data.personal?.profile_summary && (
          <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.05] p-5 text-sm leading-6 text-white/80 backdrop-blur-md sm:p-6">
            {data.personal.profile_summary}
          </div>
        )}

        {/* Sections */}
        <div className="flex flex-col gap-5">
          {/* Personal */}
          <GlassCard title="Personal" icon={<User className="h-4 w-4" />} themeColor={themeColor}>
            <InfoField label="Date of Birth" value={formatDate(data.personal?.dob)} />
            <InfoField label="Place of Birth" value={data.personal?.place_of_birth} />
            <InfoField label="Current Location" value={data.personal?.current_location} />
            <InfoField label="Gender" value={capitalize(data.personal?.gender)} />
            <InfoField label="Marital Status" value={data.personal?.marital_status} />
          </GlassCard>

          {/* Vitals */}
          {hasContent(data.vitals) && (
            <GlassCard title="Vitals" icon={<Heart className="h-4 w-4" />} themeColor={themeColor}>
              <InfoField label="Height" value={data.vitals?.height} />
              <InfoField label="Complexion" value={data.vitals?.complexion} />
              <InfoField label="Gotra" value={data.vitals?.gotra} />
            </GlassCard>
          )}

          {/* Astrology */}
          {hasContent(data.astrology) && (
            <GlassCard title="Astrology" icon={<Star className="h-4 w-4" />} themeColor={themeColor}>
              <InfoField
                label="Rashi"
                value={
                  data.astrology?.rashi
                    ? RASHI_OPTIONS.find((r) => r.key === data.astrology?.rashi)?.label
                    : undefined
                }
              />
              <InfoField label="Nakshatra" value={data.astrology?.nakshatra} />
              <InfoField label="Time of Birth" value={data.astrology?.time_of_birth} />
              <InfoField label="Manglik Status" value={data.astrology?.manglik_status} />
              <RestrictedBlock
                restricted={isSectionRestricted("astrology_details")}
                title="Unlock complete chart"
                body="Deep astrology details are reserved for serious inquiries."
              >
                <InfoField label="Lagnam" value={data.astrology?.lagnam} />
                <InfoField label="Gotra" value={data.vitals?.gotra} />
                <InfoField label="Maternal Gotra" value={data.astrology?.maternal_gotra} />
              </RestrictedBlock>
            </GlassCard>
          )}

          {/* Education */}
          {hasContent(data.education) && (
            <GlassCard title="Education" icon={<GraduationCap className="h-4 w-4" />} themeColor={themeColor}>
              <InfoField label="Degree" value={data.education?.degree} />
              <InfoField label="Institution" value={data.education?.institution} />
              <InfoField label="Location" value={data.education?.location} />
              <InfoField label="Year" value={data.education?.year} />
              <InfoField label="Summary" value={data.education?.summary} />
            </GlassCard>
          )}

          {/* Career */}
          {hasContent(data.career) && (
            <GlassCard title="Career" icon={<Briefcase className="h-4 w-4" />} themeColor={themeColor}>
              <InfoField label="Title" value={data.career?.title} />
              <InfoField label="Company" value={data.career?.company} />
              <InfoField label="Location" value={data.career?.location} />
              <InfoField label="Summary" value={data.career?.summary} />
            </GlassCard>
          )}

          {/* Family */}
          {hasFamilyContent(data.family) && (
            <GlassCard title="Family" icon={<Users className="h-4 w-4" />} themeColor={themeColor}>
              <RestrictedBlock
                restricted={isSectionRestricted("family")}
                title="Family privacy protected"
                body="Family lineage and occupational details are available after access is approved."
              >
                {data.family?.father?.name && (
                  <InfoField
                    label="Father"
                    value={`${data.family.father.name}${data.family.father.occupation ? ` — ${data.family.father.occupation}` : ""}`}
                  />
                )}
                {data.family?.mother?.name && (
                  <InfoField
                    label="Mother"
                    value={`${data.family.mother.name}${data.family.mother.occupation ? ` — ${data.family.mother.occupation}` : ""}`}
                  />
                )}
                {data.family?.siblings?.map(
                  (s, i) =>
                    s.name && (
                      <InfoField
                        key={i}
                        label="Sibling"
                        value={`${s.name}${s.occupation ? ` — ${s.occupation}` : ""}`}
                      />
                    )
                )}
                <InfoField label="Ancestral Origin" value={data.family?.ancestral_origin} />
                <InfoField label="Current Settlement" value={data.family?.current_settlement} />
                <InfoField label="Family Note" value={data.family?.family_note} />
              </RestrictedBlock>
            </GlassCard>
          )}

          {/* Lifestyle */}
          {hasContent(data.lifestyle) && (
            <GlassCard title="Lifestyle" icon={<Music className="h-4 w-4" />} themeColor={themeColor}>
              <InfoField label="Hobbies" value={data.lifestyle?.hobbies} />
              <InfoField label="Languages" value={data.lifestyle?.languages} />
              <InfoField label="Diet" value={data.lifestyle?.diet} />
              <InfoField label="Smoking" value={data.lifestyle?.smoking} />
              <InfoField label="Drinking" value={data.lifestyle?.drinking} />
              <InfoField label="Music" value={data.lifestyle?.music} />
              <InfoField label="Values" value={data.lifestyle?.values_statement} />
            </GlassCard>
          )}

          {/* Preferences */}
          {hasContent(data.preferences) && (
            <GlassCard title="Partner Preferences" icon={<Heart className="h-4 w-4" />} themeColor={themeColor}>
              <InfoField label="Summary" value={data.preferences?.narrative} />
              <InfoField label="Age" value={data.preferences?.age_range} />
              <InfoField label="Height" value={data.preferences?.height_range} />
              <InfoField label="Marital Status" value={data.preferences?.marital_status} />
              <InfoField label="Background" value={data.preferences?.background} />
              <InfoField label="Location" value={data.preferences?.location_preference} />
            </GlassCard>
          )}

          {/* Contact */}
          {hasContent(data.contact) && (
            <GlassCard title="Contact" icon={<Phone className="h-4 w-4" />} themeColor={themeColor}>
              <RestrictedBlock
                restricted={isSectionRestricted("contact")}
                title="Request secure access"
                body="Direct contact details are shared after the family approves the connection."
              >
                <InfoField label="Contact Person" value={data.contact?.contact_person} />
                <InfoField label="Phone" value={data.contact?.phone} />
                <InfoField label="Email" value={data.contact?.email} />
                <InfoField label="Note" value={data.contact?.secure_note} />
              </RestrictedBlock>
            </GlassCard>
          )}
        </div>

        {/* Footer */}
        <p className="mt-12 pb-8 text-center text-[10px] uppercase tracking-[0.2em] text-white/20">
          Created with Nakshatra
        </p>
      </div>
    </div>
  );
}

// --- Sub-components ---

function RestrictedBlock({
  restricted,
  title,
  body,
  children,
}: {
  restricted: boolean;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  if (!restricted) return <>{children}</>;

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div className="pointer-events-none select-none blur-sm opacity-45">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a1a]/45 p-4 text-center backdrop-blur-[2px]">
        <div className="max-w-xs rounded-xl border border-white/10 bg-white/[0.08] p-4">
          <LockKeyhole className="mx-auto mb-2 h-5 w-5 text-white/80" />
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-xs leading-5 text-white/60">{body}</p>
        </div>
      </div>
    </div>
  );
}

function GlassCard({
  title,
  icon,
  themeColor,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  themeColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md sm:p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <span style={{ color: themeColor }}>{icon}</span>
        <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-white/60">
          {title}
        </h2>
      </div>
      <div className="grid gap-3">{children}</div>
    </div>
  );
}

function InfoField({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <span className="shrink-0 text-xs uppercase tracking-wider text-white/40 sm:w-28">
        {label}
      </span>
      <span className="text-sm font-medium text-white/90">{value}</span>
    </div>
  );
}

// --- Utilities ---

function hasContent(obj: Record<string, unknown> | undefined): boolean {
  if (!obj) return false;
  return Object.values(obj).some(
    (v) => v !== undefined && v !== null && v !== ""
  );
}

function hasFamilyContent(
  family: PortfolioData["family"] | undefined
): boolean {
  if (!family) return false;
  return !!(
    family.father?.name ||
    family.mother?.name ||
    (family.siblings && family.siblings.some((s) => s.name))
  );
}

function formatDate(dateStr?: string): string | undefined {
  if (!dateStr) return undefined;
  try {
    const date = new Date(dateStr + "T00:00:00");
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  } catch {
    return dateStr;
  }
}

function capitalize(str?: string): string | undefined {
  if (!str) return undefined;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
