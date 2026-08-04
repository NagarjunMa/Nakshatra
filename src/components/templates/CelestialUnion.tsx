import type { CSSProperties, ReactNode } from "react";
import {
  BriefcaseBusiness,
  GraduationCap,
  LockKeyhole,
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

interface ChapterDefinition {
  id: string;
  eyebrow: string;
  title: string;
  content: ReactNode;
}

const ZODIAC_SYMBOLS: Record<RashiKey, string> = {
  mesha: "♈︎",
  vrishabha: "♉︎",
  mithuna: "♊︎",
  karka: "♋︎",
  simha: "♌︎",
  kanya: "♍︎",
  tula: "♎︎",
  vrishchika: "♏︎",
  dhanu: "♐︎",
  makara: "♑︎",
  kumbha: "♒︎",
  meena: "♓︎",
};

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
  const rashi = normalizeRashi(data.astrology?.rashi || sunSign);
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
  const blurredPhotos = photos.filter((photo) => photo.presentation === "blurred");
  const profileSummary = clean(data.personal.profile_summary);
  const age = data.personal.age ?? ageFromDate(data.personal.dob);
  const currentLocation = clean(data.personal.current_location);
  const careerTitle = clean(data.career?.title);
  const educationTitle = clean(data.education?.degree) || clean(data.education?.qualification_level);
  const journeyVisible = ownerPreview || !isRestricted(data, "journey");
  const lifestyleVisible = ownerPreview || !isRestricted(data, "lifestyle");
  const familyVisible = ownerPreview || !isRestricted(data, "family");
  const astrologyVisible = ownerPreview || !isRestricted(data, "astrology");
  const preferencesVisible = ownerPreview || !isRestricted(data, "preferences");
  const futurePlansVisible = ownerPreview || !isRestricted(data, "future_plans");
  const visibleRashi = astrologyVisible ? rashi : undefined;
  const visibleCareerTitle = journeyVisible ? careerTitle : undefined;
  const lifestyle = lifestyleVisible ? splitValues([
    data.lifestyle?.hobbies,
    data.lifestyle?.music,
    data.lifestyle?.diet,
    data.lifestyle?.languages,
  ]) : [];
  const hasEducation = journeyVisible && hasAny([
    data.education?.degree,
    data.education?.qualification_level,
    data.education?.institution,
    data.education?.year,
    data.education?.location,
    data.education?.summary,
  ]);
  const hasCareer = journeyVisible && hasAny([
    data.career?.title,
    data.career?.company,
    data.career?.location,
    data.career?.summary,
    data.career?.job_type,
    data.career?.career_goals,
  ]);
  const hasVisibleFamily = familyVisible && (hasAny([
    data.family?.public_summary,
    data.family?.paternal_origin,
    data.family?.maternal_origin,
    data.family?.ancestral_origin,
    data.family?.family_spread,
  ]) || (ownerPreview && hasDetailedFamily(data)));
  const familyProtected = isRestricted(data, "family") || isRestricted(data, "family_details");
  const hasVisibleAstrology = astrologyVisible && (Boolean(visibleRashi) || hasAny([
    data.astrology?.nakshatra,
    data.astrology?.pada,
  ]) || (ownerPreview && hasDetailedAstrology(data)));
  const astrologyProtected = isRestricted(data, "astrology") || isRestricted(data, "astrology_details");
  const hasVisiblePreferences = preferencesVisible && hasAny([
    data.preferences?.narrative,
    data.preferences?.age_range,
    data.preferences?.location_preference,
    data.preferences?.lifestyle_expectations,
  ]);
  const sharedLifeStatement = futurePlansVisible
    ? clean(data.personal.shared_life_plans)
      || clean(data.personal.long_term_goals)
      || clean(data.lifestyle?.values_statement)
    : undefined;
  const contactEntries = normalizedContacts(data.contact);
  const quickFacts = compactPairs([
    ["Age", age ? `${age} years` : undefined],
    ["Lives in", currentLocation],
    ["Profession", visibleCareerTitle],
    ["Education", journeyVisible ? educationTitle : undefined],
    ["Languages", lifestyleVisible ? clean(data.lifestyle?.languages) : undefined],
    ["Height", clean(data.vitals?.height)],
  ]);
  const protectedItems = protectedSectionLabels({
    data,
    blurredPhotos: blurredPhotos.length,
    ownerPreview,
  });
  const showProtectedSection = protectedItems.length > 0 || (ownerPreview && contactEntries.length > 0);
  const chapters: ChapterDefinition[] = [];

  if (profileSummary) {
    chapters.push({
      id: "personal-story",
      eyebrow: `Meet ${firstName(data.personal.name)}`,
      title: "Personal story",
      content: (
        <>
          <p className="portfolio-long-copy">{profileSummary}</p>
          {isRestricted(data, "personal_story") && (
            <ProtectedInline>More of this personal story can be shared after approval.</ProtectedInline>
          )}
        </>
      ),
    });
  }

  if (hasEducation || hasCareer) {
    chapters.push({
      id: "journey",
      eyebrow: "Journey",
      title: hasEducation && hasCareer ? "Education and career" : hasEducation ? "Education" : "Career",
      content: (
        <div className="portfolio-timeline">
          {hasEducation && (
            <TimelineItem
              icon={<GraduationCap aria-hidden="true" />}
              label="Education"
              title={educationTitle || clean(data.education?.institution) || "Education"}
              meta={joinValues([data.education?.institution, data.education?.year, data.education?.location])}
              detail={clean(data.education?.summary)}
            />
          )}
          {hasCareer && (
            <TimelineItem
              icon={<BriefcaseBusiness aria-hidden="true" />}
              label="Today"
              title={careerTitle || clean(data.career?.company) || "Career"}
              meta={joinValues([data.career?.company, data.career?.location, data.career?.job_type])}
              detail={clean(data.career?.summary) || clean(data.career?.career_goals)}
            />
          )}
        </div>
      ),
    });
  } else if (isRestricted(data, "journey")) {
    chapters.push(protectedChapter(
      "journey",
      "Journey",
      "Education and career",
      "Education and career information exists and may be shared after approval."
    ));
  }

  if (lifestyle.length > 0) {
    chapters.push({
      id: "lifestyle",
      eyebrow: "Everyday life",
      title: "Interests and lifestyle",
      content: <div className="portfolio-tags">{lifestyle.map((value) => <span key={value}>{value}</span>)}</div>,
    });
  }

  if (hasVisibleFamily) {
    chapters.push({
      id: "family",
      eyebrow: "Family and roots",
      title: "Family",
      content: (
        <>
          {clean(data.family?.public_summary) && <p className="portfolio-long-copy">{data.family?.public_summary}</p>}
          <div className="portfolio-detail-grid">
            {ownerPreview && <DataPair label="Father or guardian" value={familyMemberValue(data.family?.father)} />}
            {ownerPreview && <DataPair label="Mother or guardian" value={familyMemberValue(data.family?.mother)} />}
            <DataPair label="Paternal origin" value={clean(data.family?.paternal_origin) || clean(data.family?.ancestral_origin)} />
            <DataPair label="Maternal origin" value={clean(data.family?.maternal_origin)} />
            <DataPair label="Family spread" value={clean(data.family?.family_spread)} />
            {ownerPreview && <DataPair label="Parents live in" value={familyLocation(data.family)} />}
            {ownerPreview && data.family?.siblings?.map((sibling, index) => (
              <DataPair key={`${sibling.name || "sibling"}-${index}`} label={`Sibling ${index + 1}`} value={familyMemberValue(sibling)} />
            ))}
          </div>
          {familyProtected && (
            <ProtectedInline>Names, occupations, and exact family locations remain protected.</ProtectedInline>
          )}
        </>
      ),
    });
  } else if (familyProtected) {
    chapters.push(protectedChapter(
      "family",
      "Family and roots",
      "Family",
      "Family information exists and can be requested after a respectful introduction."
    ));
  }

  if (hasVisibleAstrology) {
    chapters.push({
      id: "astrology",
      eyebrow: "Astrology",
      title: "Cultural alignment",
      content: (
        <>
          <div className="portfolio-astrology-grid">
            <DataPair label="Rashi" value={rashiOption?.label} />
            <DataPair label="Nakshatra" value={clean(data.astrology?.nakshatra)} />
            <DataPair label="Pada" value={clean(data.astrology?.pada)} />
            {ownerPreview && <DataPair label="Time of birth" value={clean(data.astrology?.time_of_birth)} />}
            {ownerPreview && <DataPair label="Place of birth" value={clean(data.personal.place_of_birth)} />}
            {ownerPreview && <DataPair label="Lagnam" value={clean(data.astrology?.lagnam)} />}
            {ownerPreview && <DataPair label="Gotra" value={clean(data.vitals?.gotra)} />}
            {ownerPreview && <DataPair label="Maternal gotra" value={clean(data.astrology?.maternal_gotra)} />}
          </div>
          {astrologyProtected && (
            <ProtectedInline>Exact birth time, place, chart, and gotra remain protected.</ProtectedInline>
          )}
        </>
      ),
    });
  } else if (astrologyProtected) {
    chapters.push(protectedChapter(
      "astrology",
      "Astrology",
      "Cultural alignment",
      "Astrology information exists and can be shared after approval."
    ));
  }

  if (hasVisiblePreferences) {
    chapters.push({
      id: "preferences",
      eyebrow: "Looking ahead",
      title: "Hopes for a partnership",
      content: <p className="portfolio-partnership-copy">{data.preferences?.narrative || data.preferences?.lifestyle_expectations || data.preferences?.location_preference}</p>,
    });
  }

  const variables = {
    "--portfolio-background": theme.background,
    "--portfolio-surface": theme.surface,
    "--portfolio-surface-soft": theme.surfaceSoft,
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
      data-privacy-mode={privacyMode}
      data-access-mode={accessMode}
      className="portfolio-root"
      style={variables}
    >
      <header className="portfolio-header">
        <div className="portfolio-header-inner">
          <a href="#portfolio-top" className="portfolio-brand" aria-label="Nakshatra portfolio home">
            <Sparkles aria-hidden="true" />
            <span>Nakshatra</span>
          </a>
          {chapters.length > 0 && (
            <nav aria-label="Portfolio sections">
              {chapters.some((chapter) => chapter.id === "personal-story") && <a href="#personal-story">Story</a>}
              {chapters.some((chapter) => chapter.id === "journey") && <a href="#journey">Journey</a>}
              {galleryPhotos.length > 0 && <a href="#portfolio-gallery-title">Gallery</a>}
            </nav>
          )}
          <span className="portfolio-mode-label">
            <ShieldCheck aria-hidden="true" /> {ownerPreview ? "Owner view" : `${privacyLabel(privacyMode)} view`}
          </span>
        </div>
      </header>

      <main id="portfolio-top" className="portfolio-main">
        <section className="portfolio-hero" aria-labelledby="portfolio-name">
          <div className="portfolio-photo-stage">
            <span className="portfolio-orbit portfolio-orbit-one" aria-hidden="true" />
            <span className="portfolio-orbit portfolio-orbit-two" aria-hidden="true" />
            <div className="portfolio-primary-photo">
              <AdaptivePortfolioHero photos={heroPhotos} fallbackColor={theme.surfaceSoft} />
            </div>
          </div>
          <div className="portfolio-hero-copy">
            <p className="portfolio-eyebrow">A personal portfolio</p>
            <div className="portfolio-name-row">
              <h1 id="portfolio-name">{clean(data.personal.name) || "Personal portfolio"}</h1>
              {visibleRashi && (
                <span className="portfolio-rashi" aria-label={`Rashi: ${rashiOption?.label || visibleRashi}`}>
                  <span aria-hidden="true">{ZODIAC_SYMBOLS[visibleRashi]}</span>
                  {shortRashiLabel(rashiOption?.label || visibleRashi)}
                </span>
              )}
            </div>
            {joinValues([visibleCareerTitle, currentLocation, age ? String(age) : undefined]) && (
              <p className="portfolio-hero-line">{joinValues([visibleCareerTitle, currentLocation, age ? String(age) : undefined])}</p>
            )}
            {profileSummary && <p className="portfolio-hero-summary">{excerpt(profileSummary, 260)}</p>}
            <div className="portfolio-hero-actions">
              {chapters.length > 0 && <a className="portfolio-button portfolio-button-primary" href={`#${chapters[0].id}`}>Explore profile</a>}
              {showProtectedSection && <a className="portfolio-button portfolio-button-secondary" href="#protected-details">How privacy works</a>}
            </div>
            <p className="portfolio-contact-assurance">
              <LockKeyhole aria-hidden="true" /> Direct contact is protected in every mode.
            </p>
          </div>
        </section>

        {quickFacts.length > 0 && (
          <section className="portfolio-quick-facts" aria-label="At a glance">
            {quickFacts.map(([label, value]) => <DataPair key={label} label={label} value={value} />)}
          </section>
        )}

        <div id="portfolio-profile" className="portfolio-chapters">
          {chapters.map((chapter, index) => (
            <Chapter key={chapter.id} number={index + 1} {...chapter} />
          ))}
        </div>

        <AdaptivePortfolioGallery photos={galleryPhotos} />

        {sharedLifeStatement && (
          <section className="portfolio-emotional" aria-labelledby="shared-life-title">
            <p className="portfolio-eyebrow">The life I hope to build</p>
            <h2 id="shared-life-title">{sharedLifeStatement}</h2>
          </section>
        )}

        {showProtectedSection && (
          <section id="protected-details" className="portfolio-protected-section">
            <div className="portfolio-protected-copy">
              <p className="portfolio-eyebrow">Respectful access</p>
              <h2>{ownerPreview ? "Protected information preview" : "More can be shared after approval."}</h2>
              <p>
                {ownerPreview
                  ? "These details are visible only in the authenticated owner view."
                  : "Only information that exists is listed below. The profile owner reviews each request before deciding what to share."}
              </p>
            </div>
            {protectedItems.length > 0 && (
              <div className="portfolio-protected-items" aria-label="Protected information available">
                {protectedItems.map((item) => <span key={item}><LockKeyhole aria-hidden="true" />{item}</span>)}
              </div>
            )}
            {ownerPreview && contactEntries.length > 0 ? (
              <div className="portfolio-contact-list">
                {contactEntries.map((contact, index) => (
                  <div key={`${contact.name}-${index}`}>
                    <strong>{contact.name}{contact.relationship ? ` · ${contact.relationship}` : ""}</strong>
                    {contact.phone && <span>{contact.phone}</span>}
                    {contact.email && <span>{contact.email}</span>}
                  </div>
                ))}
              </div>
            ) : (
              <span className="portfolio-button portfolio-button-primary" aria-disabled="true">Interest requests coming soon</span>
            )}
          </section>
        )}
      </main>

      <footer className="portfolio-footer">
        <div><Sparkles aria-hidden="true" /><strong>Nakshatra</strong></div>
        <p>Privacy-first matrimonial portfolios, presented with care.</p>
      </footer>
    </div>
  );
}

function Chapter({ number, id, eyebrow, title, content }: ChapterDefinition & { number: number }) {
  return (
    <section id={id} className="portfolio-chapter" aria-labelledby={`${id}-title`}>
      <span className="portfolio-chapter-number" aria-hidden="true">{String(number).padStart(2, "0")}</span>
      <div className="portfolio-section-heading">
        <p>{eyebrow}</p>
        <h2 id={`${id}-title`}>{title}</h2>
      </div>
      <div className="portfolio-chapter-content">{content}</div>
    </section>
  );
}

function TimelineItem({ icon, label, title, meta, detail }: { icon: ReactNode; label: string; title: string; meta?: string; detail?: string }) {
  return (
    <article className="portfolio-timeline-item">
      <div className="portfolio-timeline-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <h3>{title}</h3>
        {meta && <p className="portfolio-timeline-meta">{meta}</p>}
        {detail && <p className="portfolio-section-copy">{detail}</p>}
      </div>
    </article>
  );
}

function ProtectedInline({ children }: { children: ReactNode }) {
  return <p className="portfolio-protected-note"><LockKeyhole aria-hidden="true" />{children}</p>;
}

function DataPair({ label, value }: { label: string; value?: string | null }) {
  const meaningfulValue = clean(value);
  if (!meaningfulValue) return null;
  return <div className="portfolio-data-pair"><span>{label}</span><strong>{meaningfulValue}</strong></div>;
}

function protectedChapter(id: string, eyebrow: string, title: string, message: string): ChapterDefinition {
  return {
    id,
    eyebrow,
    title,
    content: <div className="portfolio-gate"><LockKeyhole aria-hidden="true" /><p><strong>Protected information</strong><span>{message}</span></p></div>,
  };
}

function protectedSectionLabels({
  data,
  blurredPhotos,
  ownerPreview,
}: {
  data: PortfolioData;
  blurredPhotos: number;
  ownerPreview: boolean;
}) {
  if (ownerPreview) return [];
  const labels: string[] = [];
  if (isRestricted(data, "personal_story")) labels.push("Complete personal story");
  if (isRestricted(data, "journey")) labels.push("Education and career details");
  if (isRestricted(data, "lifestyle")) labels.push("Lifestyle details");
  if (isRestricted(data, "family") || isRestricted(data, "family_details")) labels.push("Family details");
  if (isRestricted(data, "astrology") || isRestricted(data, "astrology_details")) labels.push("Astrology details");
  if (isRestricted(data, "preferences")) labels.push("Partner preferences");
  if (isRestricted(data, "future_plans")) labels.push("Shared-life plans");
  if (blurredPhotos > 0) labels.push(`${blurredPhotos} protected ${blurredPhotos === 1 ? "photo" : "photos"}`);
  if (isRestricted(data, "contact")) labels.push("Direct contact");
  return Array.from(new Set(labels));
}

function normalizeRashi(value?: string | null): RashiKey | undefined {
  return RASHI_OPTIONS.some((option) => option.key === value) ? value as RashiKey : undefined;
}

function isRestricted(data: PortfolioData, key: keyof NonNullable<PortfolioData["visibility"]>) {
  return data.visibility?.[key] === "restricted";
}

function compactPairs(values: Array<[string, string | undefined]>): Array<[string, string]> {
  return values.filter((pair): pair is [string, string] => Boolean(clean(pair[1])));
}

function splitValues(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.flatMap((value) => clean(value)?.split(/[,;\n]/) ?? []).map((value) => value.trim()).filter(Boolean)));
}

function joinValues(values: Array<string | null | undefined>) {
  const populated = values.map(clean).filter((value): value is string => Boolean(value));
  return populated.length ? populated.join(" · ") : undefined;
}

function clean(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function hasAny(values: Array<string | null | undefined>) {
  return values.some((value) => Boolean(clean(value)));
}

function excerpt(value: string, maximumLength: number) {
  if (value.length <= maximumLength) return value;
  const shortened = value.slice(0, maximumLength + 1);
  const boundary = shortened.lastIndexOf(" ");
  const end = boundary > maximumLength * 0.65 ? boundary : maximumLength;
  return `${shortened.slice(0, end).trim()}…`;
}

function firstName(value?: string) {
  return clean(value)?.split(/\s+/)[0] || "this profile";
}

function shortRashiLabel(value: string) {
  return value.split(" (")[0];
}

function privacyLabel(mode: PortfolioData["privacy_mode"]) {
  if (mode === "private") return "Private";
  if (mode === "open") return "Open";
  return "Balanced";
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

function familyMemberValue(member?: { name?: string; occupation?: string; location?: string; marital_status?: string }) {
  if (!clean(member?.name)) return undefined;
  return joinValues([member?.name, member?.occupation, member?.location, member?.marital_status]);
}

function familyLocation(family?: PortfolioData["family"]) {
  return joinValues([family?.current_city, family?.current_region, family?.current_country])
    || clean(family?.parents_location)
    || clean(family?.current_settlement);
}

function hasDetailedFamily(data: PortfolioData) {
  return Boolean(
    clean(data.family?.father?.name)
    || clean(data.family?.mother?.name)
    || data.family?.siblings?.some((sibling) => hasAny([sibling.name, sibling.occupation, sibling.location]))
    || clean(data.family?.parents_location)
    || clean(data.family?.family_note)
  );
}

function hasDetailedAstrology(data: PortfolioData) {
  return hasAny([
    data.astrology?.time_of_birth,
    data.personal.place_of_birth,
    data.astrology?.lagnam,
    data.vitals?.gotra,
    data.astrology?.maternal_gotra,
    data.astrology?.manglik_status,
  ]);
}

function normalizedContacts(contact?: PortfolioData["contact"]) {
  if (contact?.contacts?.length) return contact.contacts.filter((item) => clean(item.name) && (clean(item.phone) || clean(item.email)));
  if (clean(contact?.contact_person) && (clean(contact?.phone) || clean(contact?.email))) {
    return [{ relationship: "", name: contact?.contact_person, phone: contact?.phone, email: contact?.email }];
  }
  return [];
}
