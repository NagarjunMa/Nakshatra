import type { CSSProperties, ReactNode } from "react";
import {
  BriefcaseBusiness,
  GraduationCap,
  HeartHandshake,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AdaptivePortfolioGallery, AdaptivePortfolioHero } from "./AdaptivePortfolioMedia";
import type { PortfolioPhoto } from "@/features/media/portfolio-photo";
import {
  CELESTIAL_THEME_COLORS,
  getCelestialAppearance,
} from "@/features/portfolio/celestial-theme";
import { RASHI_OPTIONS, type PortfolioData, type RashiKey } from "@/types/portfolio";

interface CelestialUnionProps {
  data: PortfolioData;
  themeColor: string;
  sunSign: string | null;
  accessMode?: "full" | "restricted";
  photos?: PortfolioPhoto[];
}

export default function CelestialUnion({
  data,
  sunSign,
  accessMode = "full",
  photos = [],
}: CelestialUnionProps) {
  const appearance = getCelestialAppearance(data.style);
  const theme = CELESTIAL_THEME_COLORS[appearance];
  const ownerPreview = accessMode === "full";
  const privacyMode = data.privacy_mode || "progressive";
  const rashi = (data.astrology?.rashi || sunSign || "") as RashiKey | "";
  const rashiOption = RASHI_OPTIONS.find((option) => option.key === rashi);
  const heroPhoto = photos.find((photo) => photo.mediaType === "hero");
  const legacyOwnerPhoto: PortfolioPhoto | null =
    ownerPreview && data.personal.photo_url && !heroPhoto
      ? {
          id: "legacy-owner-photo",
          src: data.personal.photo_url,
          alt: `${data.personal.name || "Portfolio"} portrait`,
          mediaType: "hero",
          orientation: "unknown",
        }
      : null;
  const heroPhotos = heroPhoto ? [heroPhoto] : legacyOwnerPhoto ? [legacyOwnerPhoto] : [];
  const galleryPhotos = photos.filter((photo) => photo.mediaType === "gallery");
  const age = data.personal.age ?? ageFromDate(data.personal.dob);
  const quickFacts = compactPairs([
    ["Age", age ? `${age} years` : undefined],
    ["Height", data.vitals?.height],
    ["Lives in", data.personal.current_location],
    ["Profession", data.career?.title],
    ["Education", data.education?.degree || data.education?.qualification_level],
    ["Languages", data.lifestyle?.languages],
  ]);
  const lifestyle = splitValues([
    data.lifestyle?.languages,
    data.lifestyle?.diet,
    data.lifestyle?.hobbies,
    data.lifestyle?.music,
  ]);
  const hasEducation = Boolean(data.education?.degree || data.education?.institution);
  const hasCareer = Boolean(data.career?.title || data.career?.company);
  const hasFamily = ownerPreview
    ? Boolean(
        data.family?.father?.name ||
          data.family?.mother?.name ||
          data.family?.siblings?.length ||
          data.family?.paternal_origin ||
          data.family?.maternal_origin ||
          data.family?.family_note
      )
    : Boolean(
        data.family?.public_summary ||
          data.family?.paternal_origin ||
          data.family?.maternal_origin ||
          data.family?.family_spread
      );
  const contactEntries = normalizedContacts(data.contact);
  const variables = {
    "--portfolio-background": theme.background,
    "--portfolio-surface": theme.surface,
    "--portfolio-foreground": theme.ink,
    "--portfolio-muted": theme.muted,
    "--portfolio-primary": theme.primary,
    "--portfolio-teal": theme.teal,
    "--portfolio-gold": theme.gold,
    "--portfolio-border": theme.border,
  } as CSSProperties;

  return (
    <div
      data-template="celestial-union"
      data-appearance={appearance}
      className="portfolio-root"
      style={variables}
    >
      <header className="portfolio-header">
        <div className="portfolio-header-inner">
          <a href="#portfolio-top" className="portfolio-brand" aria-label="Nakshatra portfolio home">
            <Sparkles aria-hidden="true" />
            <span>Nakshatra</span>
          </a>
          <nav aria-label="Portfolio sections">
            <a href="#portfolio-profile">Profile</a>
            {galleryPhotos.length > 0 && <a href="#portfolio-gallery-title">Gallery</a>}
            <a href="#protected-details">Privacy</a>
          </nav>
          <span className="portfolio-mode-label">
            <ShieldCheck aria-hidden="true" /> {privacyLabel(privacyMode)} view
          </span>
        </div>
      </header>

      <main id="portfolio-top" className="portfolio-main">
        <div className="portfolio-access-banner" role="note">
          <ShieldCheck aria-hidden="true" />
          <div>
            <strong>{ownerPreview ? "Owner preview" : privacyLabel(privacyMode) + " privacy"}</strong>
            <span>{accessMessage(privacyMode, ownerPreview)}</span>
          </div>
        </div>

        <section className="portfolio-hero" aria-labelledby="portfolio-name">
          <div className="portfolio-hero-copy">
            <p className="portfolio-eyebrow">A personal introduction</p>
            <div className="portfolio-name-row">
              <h1 id="portfolio-name">{data.personal.name || "Personal portfolio"}</h1>
              {rashi && (
                <ZodiacWordmark
                  rashi={rashi}
                  appearance={appearance}
                  label={rashiOption?.label || rashi}
                />
              )}
            </div>
            <p className="portfolio-hero-line">
              {joinValues([data.career?.title, data.personal.current_location, age ? String(age) : undefined])}
            </p>
            {data.personal.profile_summary && (
              <p className="portfolio-hero-summary">{data.personal.profile_summary}</p>
            )}
            <div className="portfolio-hero-actions">
              <a className="portfolio-button portfolio-button-primary" href="#protected-details">How access works</a>
              <a className="portfolio-button portfolio-button-secondary" href="#portfolio-profile">Explore profile</a>
            </div>
            <p className="portfolio-contact-assurance">
              <LockKeyhole aria-hidden="true" /> Personal contact details are always protected.
            </p>
          </div>
          <div className="portfolio-portrait-stage">
            <AdaptivePortfolioHero photos={heroPhotos} fallbackColor={theme.primary} />
          </div>
        </section>

        {quickFacts.length > 0 && (
          <section className="portfolio-quick-facts" aria-label="Quick facts">
            {quickFacts.map(([label, value]) => <DataPair key={label} label={label} value={value} />)}
          </section>
        )}

        <div id="portfolio-profile" className="portfolio-story-layout">
          <div className="portfolio-story-main">
            {(hasEducation || hasCareer) && (
              <SectionShell eyebrow="Journey" title="Education and career">
                <div className="portfolio-timeline">
                  {hasEducation && (
                    <TimelineItem icon={<GraduationCap aria-hidden="true" />} title={data.education?.degree || data.education?.qualification_level || "Education"} meta={joinValues([data.education?.institution, data.education?.year, data.education?.location])} detail={data.education?.summary} />
                  )}
                  {hasCareer && (
                    <TimelineItem icon={<BriefcaseBusiness aria-hidden="true" />} title={data.career?.title || "Career"} meta={joinValues([data.career?.company, data.career?.location])} detail={data.career?.summary} />
                  )}
                </div>
              </SectionShell>
            )}

            {data.preferences?.narrative && (
              <SectionShell eyebrow="Looking ahead" title="Hopes for a partnership">
                <div className="portfolio-narrative"><HeartHandshake aria-hidden="true" /><p>{data.preferences.narrative}</p></div>
              </SectionShell>
            )}

            {hasFamily && (
              <SectionShell eyebrow="Roots and relationships" title="Family">
                {data.family?.public_summary && <p className="portfolio-section-copy">{data.family.public_summary}</p>}
                <div className="portfolio-detail-grid">
                  {ownerPreview && <DataPair label="Father or guardian" value={familyMemberValue(data.family?.father)} />}
                  {ownerPreview && <DataPair label="Mother or guardian" value={familyMemberValue(data.family?.mother)} />}
                  <DataPair label="Paternal origin" value={data.family?.paternal_origin || data.family?.ancestral_origin} />
                  <DataPair label="Maternal origin" value={data.family?.maternal_origin} />
                  {ownerPreview && <DataPair label="Parents live in" value={familyLocation(data.family)} />}
                  {ownerPreview && data.family?.siblings?.map((sibling, index) => <DataPair key={`${sibling.name}-${index}`} label={`Sibling ${index + 1}`} value={familyMemberValue(sibling)} />)}
                </div>
              </SectionShell>
            )}

            {lifestyle.length > 0 && (
              <SectionShell eyebrow="Everyday life" title="Lifestyle and interests">
                <div className="portfolio-chips">{lifestyle.map((value) => <span key={value}>{value}</span>)}</div>
              </SectionShell>
            )}

            <AdaptivePortfolioGallery photos={galleryPhotos} />
          </div>

          <aside className="portfolio-story-aside">
            <section className="portfolio-side-section">
              <div className="portfolio-side-heading"><MapPin aria-hidden="true" /><h2>Personal details</h2></div>
              <div className="portfolio-side-list">
                {ownerPreview && <DataPair label="Date of birth" value={formatDate(data.personal.dob)} />}
                <DataPair label="Current location" value={data.personal.current_location} />
                <DataPair label="Height" value={data.vitals?.height} />
                <DataPair label="Marital status" value={data.personal.marital_status} />
                {ownerPreview && <DataPair label="Visa or residency" value={data.personal.immigration_status} />}
                {ownerPreview && <DataPair label="Citizenship" value={data.personal.citizenship} />}
              </div>
            </section>

            {(rashi || data.astrology?.nakshatra || ownerPreview) && (
              <section className="portfolio-side-section">
                <div className="portfolio-side-heading"><Sparkles aria-hidden="true" /><h2>Astrology</h2></div>
                <div className="portfolio-side-list">
                  <DataPair label="Rashi" value={rashiOption?.label} />
                  <DataPair label="Nakshatra" value={data.astrology?.nakshatra} />
                  <DataPair label="Pada" value={data.astrology?.pada} />
                  {ownerPreview && <DataPair label="Time of birth" value={data.astrology?.time_of_birth} />}
                  {ownerPreview && <DataPair label="Place of birth" value={data.personal.place_of_birth} />}
                  {ownerPreview && <DataPair label="Lagnam" value={data.astrology?.lagnam} />}
                  {ownerPreview && <DataPair label="Gotra" value={data.vitals?.gotra} />}
                  {ownerPreview && <DataPair label="Maternal gotra" value={data.astrology?.maternal_gotra} />}
                </div>
                {!ownerPreview && <p className="portfolio-protected-note"><LockKeyhole aria-hidden="true" /> Exact birth and gotra details require approval.</p>}
              </section>
            )}
          </aside>
        </div>

        <section id="protected-details" className="portfolio-protected-section">
          <div className="portfolio-protected-icon"><LockKeyhole aria-hidden="true" /></div>
          <div className="portfolio-protected-copy">
            <p className="portfolio-eyebrow">Respectful access</p>
            <h2>{ownerPreview ? "Protected contact preview" : "Some information is shared after approval"}</h2>
            <p>{ownerPreview ? "These details are visible here only because this is the owner preview." : "An interest request will allow the profile owner to review who is asking before sharing further details. Contact permission remains a separate choice."}</p>
          </div>
          {ownerPreview && contactEntries.length > 0 ? (
            <div className="portfolio-contact-list">
              {contactEntries.map((contact, index) => (
                <div key={`${contact.name}-${index}`}>
                  <strong>{contact.name}{contact.relationship ? ` - ${contact.relationship}` : ""}</strong>
                  {contact.phone && <span>{contact.phone}</span>}
                  {contact.email && <span>{contact.email}</span>}
                </div>
              ))}
            </div>
          ) : (
            <span className="portfolio-button portfolio-button-primary" aria-disabled="true">Interest requests coming soon</span>
          )}
        </section>
      </main>

      <footer className="portfolio-footer">
        <div><Sparkles aria-hidden="true" /><strong>Nakshatra</strong></div>
        <p>Privacy-first matrimonial portfolios, presented with care.</p>
      </footer>
    </div>
  );
}

function ZodiacWordmark({ rashi, appearance, label }: { rashi: RashiKey; appearance: "light" | "dark"; label: string }) {
  return (
    <span className="portfolio-zodiac" title={label}>
      {/* The licensed source is vector artwork; img keeps SVG rendering crisp and isolated. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/zodiac/${rashi}-${appearance}.svg`} alt={`${label} zodiac`} />
    </span>
  );
}

function SectionShell({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return <section className="portfolio-section"><div className="portfolio-section-heading"><p>{eyebrow}</p><h2>{title}</h2></div>{children}</section>;
}

function TimelineItem({ icon, title, meta, detail }: { icon: ReactNode; title: string; meta?: string; detail?: string }) {
  return <div className="portfolio-timeline-item"><div className="portfolio-timeline-icon">{icon}</div><div><h3>{title}</h3>{meta && <p className="portfolio-timeline-meta">{meta}</p>}{detail && <p className="portfolio-section-copy">{detail}</p>}</div></div>;
}

function DataPair({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim()) return null;
  return <div className="portfolio-data-pair"><span>{label}</span><strong>{value}</strong></div>;
}

function compactPairs(values: Array<[string, string | undefined]>): Array<[string, string]> {
  return values.filter((pair): pair is [string, string] => Boolean(pair[1]?.trim()));
}

function splitValues(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)).flatMap((value) => value.split(/[,;\n]/)).map((value) => value.trim()).filter(Boolean)));
}

function joinValues(values: Array<string | null | undefined>) {
  const populated = values.filter((value): value is string => Boolean(value?.trim()));
  return populated.length ? populated.join(" · ") : undefined;
}

function privacyLabel(mode: PortfolioData["privacy_mode"]) {
  if (mode === "private") return "Private";
  if (mode === "open") return "Open";
  return "Balanced";
}

function accessMessage(mode: PortfolioData["privacy_mode"], ownerPreview: boolean) {
  if (ownerPreview) return "This preview includes private information so you can verify it before publishing.";
  if (mode === "private") return "A short introduction is visible. More can be shared after the owner reviews an interest request.";
  if (mode === "open") return "More background is visible, while contact and highly sensitive information remain protected.";
  return "A meaningful introduction is visible. Sensitive details are shared only after the owner reviews a request.";
}

function ageFromDate(value?: string) {
  if (!value) return undefined;
  const birth = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(birth.getTime())) return undefined;
  const today = new Date();
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  if (today.getUTCMonth() < birth.getUTCMonth() || (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age >= 18 && age <= 120 ? age : undefined;
}

function formatDate(value?: string) {
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  const [year, month, day] = value.split("-").map(Number);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) return value;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

function familyMemberValue(member?: { name?: string; occupation?: string; location?: string; marital_status?: string }) {
  if (!member?.name) return undefined;
  return joinValues([member.name, member.occupation, member.location, member.marital_status]);
}

function familyLocation(family?: PortfolioData["family"]) {
  return joinValues([family?.current_city, family?.current_region, family?.current_country]) || family?.parents_location || family?.current_settlement;
}

function normalizedContacts(contact?: PortfolioData["contact"]) {
  if (contact?.contacts?.length) return contact.contacts.filter((item) => item.name && (item.phone || item.email));
  if (contact?.contact_person && (contact.phone || contact.email)) return [{ relationship: "", name: contact.contact_person, phone: contact.phone, email: contact.email }];
  return [];
}
