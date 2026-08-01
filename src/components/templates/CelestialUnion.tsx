import type { CSSProperties, ReactNode } from "react";
import {
  BriefcaseBusiness,
  CalendarDays,
  GraduationCap,
  LockKeyhole,
  MapPin,
  MoonStar,
  Quote,
  Sparkles,
} from "lucide-react";
import {
  AdaptivePortfolioGallery,
  AdaptivePortfolioHero,
} from "./AdaptivePortfolioMedia";
import { ConstellationBackdrop } from "./ConstellationBackdrop";
import type { PortfolioPhoto } from "@/features/media/portfolio-photo";
import { resolveRashiTheme } from "@/features/portfolio/rashi-theme";
import { RASHI_OPTIONS, type PortfolioData } from "@/types/portfolio";

interface CelestialUnionProps {
  data: PortfolioData;
  themeColor: string;
  sunSign: string | null;
  accessMode?: "full" | "restricted";
  photos?: PortfolioPhoto[];
}

/**
 * Renders the canonical Celestial Union portfolio from sanitized data and public media.
 * Input: portfolio snapshot, selected theme, rashi, access mode, and signed public photos.
 * Output: responsive Royal Heritage-inspired portfolio markup.
 */
export default function CelestialUnion({
  data,
  themeColor,
  sunSign,
  accessMode = "full",
  photos = [],
}: CelestialUnionProps) {
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
  const legacyOwnerPhoto: PortfolioPhoto | null =
    !restrictedMode &&
    data.personal?.photo_url &&
    !photos.some((photo) => photo.mediaType === "hero")
      ? {
          id: "legacy-owner-photo",
          src: data.personal.photo_url,
          alt: `${data.personal.name || "Portfolio"} portrait`,
          mediaType: "hero",
          orientation: "unknown",
        }
      : null;
  const heroPhotos = legacyOwnerPhoto ? [legacyOwnerPhoto, ...photos] : photos;
  const galleryPhotos = photos.filter((photo) => photo.mediaType === "gallery");
  const themeVariables = {
    "--portfolio-background": theme.background,
    "--portfolio-foreground": theme.foreground,
    "--portfolio-muted": theme.mutedForeground,
    "--portfolio-accent": theme.accentOnSurface,
    "--portfolio-hero-accent": theme.accentOnHero,
    "--portfolio-emboss-highlight": theme.foreground,
    "--portfolio-emboss-shadow": "#000000",
  } as CSSProperties;

  /**
   * Resolves whether a public viewer should receive a data-free locked section.
   * Input: portfolio visibility key. Output: true when the section requires approved access.
   */
  function isRestricted(
    key: keyof NonNullable<PortfolioData["visibility"]>
  ) {
    return (
      restrictedMode &&
      (data.visibility?.[key] ?? "restricted") === "restricted"
    );
  }

  return (
    <div
      data-template="celestial-union"
      className="portfolio-root"
      style={themeVariables}
    >
      <ConstellationBackdrop
        constellationPath={theme.constellationPath}
        variant="page"
      />

      <header className="portfolio-header">
        <div className="portfolio-header-inner">
          <a href="#portfolio-profile" className="portfolio-brand">
            <Sparkles aria-hidden="true" />
            <span>Nakshatra</span>
          </a>
          <p>Celestial Union</p>
        </div>
      </header>

      <main className="portfolio-main">
        <section className="portfolio-hero" aria-labelledby="portfolio-name">
          <AdaptivePortfolioHero
            photos={heroPhotos}
            fallbackColor={theme.accentOnSurface}
          />
          <div className="portfolio-hero-gradient" />
          <div className="portfolio-hero-content">
            <div className="portfolio-hero-copy">
              <p className="portfolio-invocation">ॐ श्री गणेशाय नमः</p>
              <h1 id="portfolio-name">
                {data.personal?.name || "Your Name"}
              </h1>
              {data.personal?.preferred_name && (
                <p className="portfolio-preferred-name">
                  {data.personal.preferred_name}
                </p>
              )}
              <div className="portfolio-hero-meta">
                {data.personal?.dob && (
                  <Meta
                    icon={<CalendarDays aria-hidden="true" />}
                    value={formatDate(data.personal.dob)}
                  />
                )}
                {data.personal?.current_location && (
                  <Meta
                    icon={<MapPin aria-hidden="true" />}
                    value={data.personal.current_location}
                  />
                )}
              </div>
            </div>

            {rashiLabel && (
              <div className="portfolio-rashi-card">
                <MoonStar aria-hidden="true" />
                <div>
                  <p>Rashi</p>
                  <strong>{rashiLabel}</strong>
                </div>
              </div>
            )}
          </div>
        </section>

        <section id="portfolio-profile" className="portfolio-content-grid">
          <aside className="portfolio-facts-column">
            <PortfolioCard title="Vitals" constellationPath={theme.constellationPath}>
              <DataPair label="Height" value={data.vitals?.height} />
              <DataPair label="Complexion" value={data.vitals?.complexion} />
              {isRestricted("astrology_details") ? (
                <LockedDetail label="Gotra" />
              ) : (
                <DataPair label="Gotra" value={data.vitals?.gotra} />
              )}
            </PortfolioCard>

            <PortfolioCard title="Astrology" constellationPath={theme.constellationPath}>
              <DataPair label="Nakshatra" value={data.astrology?.nakshatra} />
              <DataPair label="Pada" value={data.astrology?.pada} />
              {isRestricted("astrology_details") ? (
                <LockedDetail label="Birth details" />
              ) : (
                <>
                  <DataPair label="Time of birth" value={data.astrology?.time_of_birth} />
                  <DataPair label="Lagnam" value={data.astrology?.lagnam} />
                </>
              )}
            </PortfolioCard>
          </aside>

          <div className="portfolio-chapters">
            {data.personal?.profile_summary && (
              <section className="portfolio-introduction">
                <p>In their own words</p>
                <blockquote>{data.personal.profile_summary}</blockquote>
              </section>
            )}

            <div className="portfolio-bento">
              <ChapterCard
                title="Education"
                icon={<GraduationCap aria-hidden="true" />}
                primary={data.education?.degree || data.education?.qualification_level}
                secondary={joinValues([
                  data.education?.institution,
                  data.education?.year,
                  data.education?.location,
                ])}
                detail={data.education?.summary}
              />
              <ChapterCard
                title="Career"
                icon={<BriefcaseBusiness aria-hidden="true" />}
                primary={data.career?.title}
                secondary={joinValues([data.career?.company, data.career?.location])}
                detail={data.career?.summary}
              />
            </div>

            <section className="portfolio-family-card">
              <ConstellationBackdrop
                constellationPath={theme.constellationPath}
                variant="card"
              />
              <h2>Family Heritage</h2>
              {isRestricted("family") ? (
                <LockedPanel message="Family details are shared after approval" />
              ) : (
                <div className="portfolio-family-grid">
                  <DataPair label="Father" value={familyMemberValue(data.family?.father)} />
                  <DataPair label="Mother" value={familyMemberValue(data.family?.mother)} />
                  {data.family?.siblings?.map((sibling, index) => (
                    <DataPair
                      key={`${sibling.name || "sibling"}-${index}`}
                      label="Sibling"
                      value={familyMemberValue(sibling)}
                    />
                  ))}
                  <DataPair label="Ancestral origin" value={data.family?.ancestral_origin} />
                  <DataPair
                    label="Immediate family location"
                    value={familyLocation(data.family)}
                  />
                  <DataPair label="Family background" value={data.family?.family_note} />
                  <DataPair label="Wider family" value={data.family?.family_spread} />
                </div>
              )}
            </section>

            <section className="portfolio-lifestyle-card">
              <div className="portfolio-section-heading">
                <p>A life in balance</p>
                <h2>Lifestyle &amp; Interests</h2>
              </div>
              <ChipList
                values={[
                  data.lifestyle?.diet,
                  data.lifestyle?.languages,
                  data.lifestyle?.hobbies,
                  data.lifestyle?.music,
                ]}
              />
            </section>

            <AdaptivePortfolioGallery photos={galleryPhotos} />

            {isRestricted("contact") ? (
              <section className="portfolio-private-card">
                <LockedPanel message="Contact details are shared after approval" />
              </section>
            ) : hasContactDetails(data.contact) ? (
              <section className="portfolio-private-card">
                <div className="portfolio-section-heading">
                  <p>Direct connection</p>
                  <h2>Contact</h2>
                </div>
                <div className="portfolio-family-grid">
                  <DataPair label="Contact person" value={data.contact?.contact_person} />
                  <DataPair label="Phone" value={data.contact?.phone} />
                  <DataPair label="Email" value={data.contact?.email} />
                  <DataPair label="Secure note" value={data.contact?.secure_note} />
                </div>
              </section>
            ) : null}
          </div>
        </section>

        <section className="portfolio-quote-section">
          <Quote aria-hidden="true" />
          <blockquote>
            {data.preferences?.narrative ||
              "Finding the cosmic alignment between two souls in this vast universe."}
          </blockquote>
          <span />
        </section>
      </main>

      <footer className="portfolio-footer">
        <p>Nakshatra</p>
        <span>Curated with care</span>
      </footer>
    </div>
  );
}

/**
 * Renders one consistent glass information card with a rashi emboss.
 * Input: title, constellation asset, and values. Output: labelled portfolio panel.
 */
function PortfolioCard({
  title,
  constellationPath,
  children,
}: {
  title: string;
  constellationPath: string | null;
  children: ReactNode;
}) {
  return (
    <section className="portfolio-fact-card">
      <ConstellationBackdrop
        constellationPath={constellationPath}
        variant="card"
      />
      <h2>{title}</h2>
      <div className="portfolio-fact-list">{children}</div>
    </section>
  );
}

/**
 * Renders a compact education or career chapter when information is available.
 * Input: title, icon, primary value, secondary metadata, and optional detail. Output: chapter card.
 */
function ChapterCard({
  title,
  icon,
  primary,
  secondary,
  detail,
}: {
  title: string;
  icon: ReactNode;
  primary?: string | null;
  secondary?: string | null;
  detail?: string | null;
}) {
  return (
    <section className="portfolio-chapter-card">
      <div className="portfolio-chapter-title">
        {icon}
        <h2>{title}</h2>
      </div>
      <p className="portfolio-chapter-primary">{primary || "Not provided"}</p>
      {secondary && <p className="portfolio-chapter-secondary">{secondary}</p>}
      {detail && <p className="portfolio-chapter-detail">{detail}</p>}
    </section>
  );
}

/**
 * Renders one labelled value when the sanitized snapshot contains it.
 * Input: field label and optional value. Output: value pair or null.
 */
function DataPair({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="portfolio-data-pair">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

/**
 * Shows a data-free indicator for one protected value.
 * Input: protected field label. Output: lock treatment without private content.
 */
function LockedDetail({ label }: { label: string }) {
  return (
    <div className="portfolio-locked-detail">
      <LockKeyhole aria-hidden="true" />
      <span>{label} is private</span>
    </div>
  );
}

/**
 * Shows a data-free locked panel for sections requiring owner approval.
 * Input: public privacy message. Output: accessible lock treatment.
 */
function LockedPanel({ message }: { message: string }) {
  return (
    <div className="portfolio-locked-panel">
      <LockKeyhole aria-hidden="true" />
      <div>
        <p>Private by design</p>
        <strong>{message}</strong>
      </div>
    </div>
  );
}

/**
 * Renders compact hero metadata with its icon.
 * Input: decorative icon and display value. Output: inline metadata item.
 */
function Meta({ icon, value }: { icon: ReactNode; value: string }) {
  return (
    <span>
      {icon}
      {value}
    </span>
  );
}

/**
 * Splits dashboard text into individual portfolio interest labels.
 * Input: optional delimited values. Output: normalized display chips.
 */
function ChipList({ values }: { values: Array<string | null | undefined> }) {
  const chips = values
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.split(/[,;\n]/))
    .map((value) => value.trim())
    .filter(Boolean);

  if (!chips.length) return <p className="portfolio-empty-copy">Interests have not been added yet.</p>;

  return (
    <div className="portfolio-chips">
      {chips.map((value) => (
        <span key={value}>{value}</span>
      ))}
    </div>
  );
}

/**
 * Joins optional chapter metadata without leaving empty separators.
 * Input: optional values. Output: a bullet-separated string or undefined.
 */
function joinValues(values: Array<string | null | undefined>) {
  const populated = values.filter((value): value is string => Boolean(value));
  return populated.length ? populated.join(" • ") : undefined;
}

/**
 * Formats an ISO date without allowing timezone conversion to change the day.
 * Input: YYYY-MM-DD date. Output: uppercase day, month, and year.
 */
function formatDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;

  const [, year, month, day] = match;
  const date = new Date(`${value}T00:00:00`);
  const isValidCalendarDate =
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === Number(year) &&
    date.getMonth() + 1 === Number(month) &&
    date.getDate() === Number(day);
  if (!isValidCalendarDate) return value;

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(date)
    .toUpperCase();
}

/** Formats a family member without exposing an empty occupation separator. */
function familyMemberValue(member?: { name?: string; occupation?: string }) {
  if (!member?.name) return undefined;
  return member.occupation ? `${member.name} - ${member.occupation}` : member.name;
}

/** Builds the most specific available immediate-family location. */
function familyLocation(family?: PortfolioData["family"]) {
  const structuredLocation = [
    family?.current_city,
    family?.current_region,
    family?.current_country,
  ]
    .filter((value): value is string => Boolean(value))
    .join(", ");

  return (
    structuredLocation ||
    family?.parents_location ||
    family?.current_settlement
  );
}

/** Reports whether the owner draft contains any contact value worth rendering. */
function hasContactDetails(contact?: PortfolioData["contact"]) {
  return Boolean(
    contact?.contact_person ||
      contact?.phone ||
      contact?.email ||
      contact?.secure_note
  );
}
