import type { CSSProperties, ReactNode } from "react";
import {
  BriefcaseBusiness,
  GraduationCap,
  FileText,
  ExternalLink,
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
import { RASHI_OPTIONS, type PortfolioData, type PortfolioHoroscopeAttachment, type RashiKey } from "@/types/portfolio";

interface CelestialUnionProps {
  data: PortfolioData;
  themeColor: string;
  sunSign: string | null;
  accessMode?: "owner" | "approved" | "public";
  photos?: PortfolioPhoto[];
  horoscopeAttachment?: PortfolioHoroscopeAttachment;
  interestAction?: ReactNode;
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
  accessMode = "owner",
  photos = [],
  horoscopeAttachment,
  interestAction,
}: CelestialUnionProps) {
  const appearance = getCelestialAppearance(data.style);
  const theme = CELESTIAL_THEME_COLORS[appearance];
  const ownerPreview = accessMode === "owner";
  const approvedViewer = accessMode === "approved";
  const hasApprovedAccess = ownerPreview || approvedViewer;
  const privacyMode = data.privacy_mode || "balanced";
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
  const shortBio = clean(data.personal.short_bio);
  const profileSummary = clean(data.personal.profile_summary);
  const age = data.personal.age ?? ageFromDate(data.personal.dob);
  const currentLocation = clean(data.personal.current_location);
  const careerTitle = clean(data.career?.title);
  const educationTitle = clean(data.education?.degree) || clean(data.education?.qualification_level);
  const journeyVisible = hasApprovedAccess || !isRestricted(data, "journey");
  const lifestyleVisible = hasApprovedAccess || !isRestricted(data, "lifestyle");
  const familyVisible = hasApprovedAccess || !isRestricted(data, "family");
  const astrologyVisible = hasApprovedAccess || !isRestricted(data, "astrology");
  const preferencesVisible = hasApprovedAccess || !isRestricted(data, "preferences");
  const futurePlansVisible = hasApprovedAccess || !isRestricted(data, "future_plans");
  const visibleRashi = astrologyVisible ? rashi : undefined;
  const hobbies = lifestyleVisible ? splitValues([data.lifestyle?.hobbies]) : [];
  const languages = splitValues([data.lifestyle?.languages]);
  const values = splitValues([data.lifestyle?.values_statement]);
  const hasPersonalDetails = hasAny([
    data.personal.marital_status,
    data.personal.citizenship,
    data.personal.religion,
    data.personal.sub_community,
  ]);
  const hasLifestyle = lifestyleVisible && (
    hobbies.length > 0 ||
    hasAny([
      data.lifestyle?.diet,
      data.lifestyle?.drinking,
      data.lifestyle?.smoking,
    ])
  );
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
    data.personal.community,
    data.family?.sibling_position,
  ]) || data.family?.sibling_count !== undefined || (hasApprovedAccess && hasDetailedFamily(data)));
  const familyProtected = isRestricted(data, "family") || isRestricted(data, "family_details");
  const hasVisibleAstrology = Boolean(horoscopeAttachment) || (
    astrologyVisible && (
      Boolean(visibleRashi)
      || hasAny([
        data.astrology?.nakshatra,
        data.astrology?.pada,
        data.vitals?.gotra,
        data.astrology?.maternal_gotra,
        data.astrology?.manglik_status,
      ])
      || (hasApprovedAccess && hasDetailedAstrology(data))
    )
  );
  const astrologyProtected = isRestricted(data, "astrology") || isRestricted(data, "astrology_details");
  const hasVisiblePreferences = preferencesVisible && hasAny([
    data.preferences?.narrative,
    data.preferences?.age_range,
    data.preferences?.height_range,
    data.preferences?.lifestyle_expectations,
    data.preferences?.caste_preference,
    data.preferences?.horoscope_preference,
  ]);
  const hasStructuredFuturePlans = hasApprovedAccess && hasAny([
    data.preferences?.marriage_timeline,
    data.preferences?.children_preference,
    data.personal.relocation_preference,
    data.preferences?.career_after_marriage,
    data.preferences?.living_arrangement,
    data.preferences?.family_responsibilities,
  ]);
  const sharedLifeStatement = futurePlansVisible
    ? clean(data.personal.shared_life_plans)
      || clean(data.personal.long_term_goals)
    : undefined;
  const visibleCareerTitle = journeyVisible ? careerTitle : undefined;
  const heroLine = joinValues([
    visibleCareerTitle,
    currentLocation,
    age ? String(age) : undefined,
  ]);
  const contactEntries = normalizedContacts(data.contact);
  const quickFacts = compactPairs([
    ["Zodiac", visibleRashi && rashiOption ? `${ZODIAC_SYMBOLS[visibleRashi]} ${rashiOption.label}` : undefined],
    ["Age", age ? `${age} years` : undefined],
    ["Height", clean(data.vitals?.height)],
    ["Lives in", currentLocation],
  ]);
  const protectedItems = protectedSectionLabels({
    data,
    blurredPhotos: blurredPhotos.length,
    hasApprovedAccess,
  });
  const showProtectedSection = protectedItems.length > 0 || (ownerPreview && contactEntries.length > 0);
  const chapters: ChapterDefinition[] = [];

  if (profileSummary || hasPersonalDetails || languages.length > 0 || values.length > 0) {
    chapters.push({
      id: "personal-story",
      eyebrow: `Meet ${firstName(data.personal.name)}`,
      title: "Personal story",
      content: (
        <div className="portfolio-personal-content">
          {profileSummary && <p className="portfolio-long-copy">{profileSummary}</p>}
          {hasPersonalDetails && (
            <div className="portfolio-detail-grid portfolio-personal-details">
              <DataPair label="Marital status" value={clean(data.personal.marital_status)} />
              <DataPair label="Citizenship" value={clean(data.personal.citizenship)} />
              <DataPair label="Religion or outlook" value={clean(data.personal.religion)} />
              <DataPair label="Sub-community" value={clean(data.personal.sub_community)} />
              <DataPair label="Languages spoken" value={languages.join(", ")} />
            </div>
          )}
          {!hasPersonalDetails && (languages.length > 0 || values.length > 0) && (
            <div className="portfolio-detail-grid portfolio-personal-details">
              <DataPair label="Languages spoken" value={languages.join(", ")} />
            </div>
          )}
          {values.length > 0 && (
            <div className="portfolio-personal-values">
              <DataPair label="Values" value={values.join(", ")} />
            </div>
          )}
        </div>
      ),
    });
  }

  if (hasEducation || hasCareer || clean(data.personal.immigration_status)) {
    chapters.push({
      id: "journey",
      eyebrow: "Journey",
      title: hasEducation && hasCareer
        ? "Education and career"
        : hasEducation
          ? "Education"
          : hasCareer
            ? "Career"
            : "Work and residency",
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
            <>
              <TimelineItem
                icon={<BriefcaseBusiness aria-hidden="true" />}
                label="Today"
                title={careerTitle || clean(data.career?.company) || "Career"}
                meta={joinValues([data.career?.company, data.career?.location, data.career?.job_type])}
                detail={clean(data.career?.summary) || clean(data.career?.career_goals)}
              />
            </>
          )}
          {hasAny([
            data.personal.immigration_status,
            hasApprovedAccess ? data.career?.annual_income : undefined,
            hasApprovedAccess ? data.career?.income_currency : undefined,
          ]) && (
            <div className="portfolio-detail-grid portfolio-timeline-details">
              <DataPair label="Visa or residency" value={clean(data.personal.immigration_status)} />
              {hasApprovedAccess && <DataPair label="Annual income range" value={joinValues([data.career?.annual_income, data.career?.income_currency])} />}
            </div>
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

  if (hasLifestyle) {
    chapters.push({
      id: "lifestyle",
      eyebrow: "Everyday life",
      title: "Lifestyle and interests",
      content: (
        <div className="portfolio-lifestyle-groups">
          {hasAny([data.lifestyle?.diet, data.lifestyle?.drinking, data.lifestyle?.smoking]) && (
            <div className="portfolio-detail-grid portfolio-lifestyle-details">
              <DataPair label="Diet" value={clean(data.lifestyle?.diet)} />
              {(hasApprovedAccess || privacyMode === "balanced") && <DataPair label="Drinking" value={clean(data.lifestyle?.drinking)} />}
              {(hasApprovedAccess || privacyMode === "balanced") && <DataPair label="Smoking" value={clean(data.lifestyle?.smoking)} />}
            </div>
          )}
          {hobbies.length > 0 && (
            <div className="portfolio-lifestyle-group">
              <h3>Interests</h3>
              <div className="portfolio-tags">{hobbies.map((value) => <span key={value}>{value}</span>)}</div>
            </div>
          )}
        </div>
      ),
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
            {hasApprovedAccess && <DataPair label="Father or guardian" value={familyMemberValue(data.family?.father)} />}
            {hasApprovedAccess && <DataPair label="Mother or guardian" value={familyMemberValue(data.family?.mother)} />}
            <DataPair label="Paternal origin" value={clean(data.family?.paternal_origin) || clean(data.family?.ancestral_origin)} />
            <DataPair label="Maternal origin" value={clean(data.family?.maternal_origin)} />
            <DataPair label="Community" value={clean(data.personal.community)} />
            <DataPair label="Family spread" value={clean(data.family?.family_spread)} />
            {hasApprovedAccess && <DataPair label="Parents live in" value={familyLocation(data.family)} />}
            <DataPair label="Number of siblings" value={data.family?.sibling_count !== undefined ? String(data.family.sibling_count) : undefined} />
            <DataPair label="Position among siblings" value={clean(data.family?.sibling_position)} />
            {hasApprovedAccess && data.family?.siblings?.map((sibling, index) => (
              <DataPair key={`${sibling.name || "sibling"}-${index}`} label={`Sibling ${index + 1}`} value={familyMemberValue(sibling)} />
            ))}
          </div>
          {familyProtected && !hasApprovedAccess && (
            <ProtectedInline>
              {privacyMode === "private"
                ? "Additional family background, names, occupations, and exact locations remain protected."
                : "Names, occupations, and exact family locations remain protected."}
            </ProtectedInline>
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
            {hasApprovedAccess && <DataPair label="Date of birth" value={validDate(data.personal.dob)} />}
            {hasApprovedAccess && <DataPair label="Time of birth" value={clean(data.astrology?.time_of_birth)} />}
            {hasApprovedAccess && <DataPair label="Place of birth" value={clean(data.personal.place_of_birth)} />}
            {hasApprovedAccess && <DataPair label="Lagnam" value={clean(data.astrology?.lagnam)} />}
            <DataPair label="Paternal gothram" value={clean(data.vitals?.gotra)} />
            <DataPair label="Maternal gothram" value={clean(data.astrology?.maternal_gotra)} />
            <DataPair label="Manglik status" value={clean(data.astrology?.manglik_status)} />
          </div>
          {astrologyProtected && !hasApprovedAccess && (
            <ProtectedInline>
              {privacyMode === "private"
                ? "Additional astrology and exact birth details remain protected."
                : "Exact birth date, time, place, and chart remain protected."}
            </ProtectedInline>
          )}
          {horoscopeAttachment && (
            <a className="portfolio-horoscope-attachment" href={horoscopeAttachment.href} target="_blank" rel="noreferrer">
              <span className="portfolio-horoscope-icon"><FileText aria-hidden="true" /></span>
              <span className="portfolio-horoscope-copy">
                <strong>Original horoscope</strong>
                <span>
                  {[horoscopeAttachment.formatLabel, horoscopeAttachment.languageLabel, horoscopeAttachment.pageCount ? `${horoscopeAttachment.pageCount} ${horoscopeAttachment.pageCount === 1 ? "page" : "pages"}` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                <small><LockKeyhole aria-hidden="true" /> Approved access</small>
              </span>
              <span className="portfolio-horoscope-action">View document <ExternalLink aria-hidden="true" /></span>
            </a>
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
      content: (
        <>
          {clean(data.preferences?.narrative) && <p className="portfolio-long-copy">{data.preferences?.narrative}</p>}
          {hasApprovedAccess && (
            <div className="portfolio-detail-grid portfolio-preference-grid">
              <DataPair label="Preferred age" value={clean(data.preferences?.age_range)} />
              <DataPair label="Preferred height" value={clean(data.preferences?.height_range)} />
              <DataPair label="Visa or residency" value={clean(data.preferences?.visa_preferences)} />
              <DataPair label="Community preference" value={preferenceCommunity(data.preferences)} />
              <DataPair label="Horoscope matching" value={clean(data.preferences?.horoscope_preference)} />
              <DataPair label="Lifestyle expectations" value={clean(data.preferences?.lifestyle_expectations)} />
              <DataPair label="Education expectations" value={clean(data.preferences?.education_expectations)} />
              <DataPair label="Career expectations" value={clean(data.preferences?.career_expectations)} />
            </div>
          )}
        </>
      ),
    });
  }

  if (hasStructuredFuturePlans) {
    chapters.push({
      id: "future-plans",
      eyebrow: "Important conversations",
      title: "Future plans",
      content: (
        <div className="portfolio-detail-grid">
          <DataPair label="Marriage timeline" value={clean(data.preferences?.marriage_timeline)} />
          <DataPair label="Children" value={clean(data.preferences?.children_preference)} />
          <DataPair label="Relocation" value={clean(data.personal.relocation_preference)} />
          <DataPair label="Supporting both careers" value={clean(data.preferences?.career_after_marriage)} />
          <DataPair label="Living arrangement" value={clean(data.preferences?.living_arrangement)} />
          <DataPair label="Family responsibilities" value={clean(data.preferences?.family_responsibilities)} />
        </div>
      ),
    });
  }

  if (sharedLifeStatement) {
    chapters.push({
      id: "shared-life",
      eyebrow: "Shared future",
      title: "The life I hope to build",
      content: <p className="portfolio-long-copy">{sharedLifeStatement}</p>,
    });
  }

  const numberedChapters = chapters.map((chapter, index) => ({
    ...chapter,
    number: index + 1,
  }));
  const pairedChapterIds = new Set(["journey", "lifestyle", "family", "astrology"]);
  const leadingChapterIds = new Set(["personal-story"]);
  const leadingChapters = numberedChapters.filter((chapter) => leadingChapterIds.has(chapter.id));
  const pairedChapterRows = [
    ["journey", "lifestyle"],
    ["family", "astrology"],
  ].map((row) => row.map((id) => numberedChapters.find((chapter) => chapter.id === id)).filter((chapter): chapter is typeof numberedChapters[number] => Boolean(chapter))).filter((row) => row.length > 0);
  const trailingChapters = numberedChapters.filter(
    (chapter) => !leadingChapterIds.has(chapter.id) && !pairedChapterIds.has(chapter.id)
  );

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
            <ShieldCheck aria-hidden="true" /> {ownerPreview ? "Owner preview" : approvedViewer ? "Full portfolio" : privacyLabel(privacyMode)}
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
            </div>
            {heroLine && <p className="portfolio-hero-line">{heroLine}</p>}
            {shortBio && <p className="portfolio-hero-summary">{shortBio}</p>}
          </div>
        </section>

        {quickFacts.length > 0 && (
          <section className="portfolio-quick-facts" aria-label="At a glance">
            {quickFacts.map(([label, value]) => <DataPair key={label} label={label} value={value} />)}
          </section>
        )}

        <div id="portfolio-profile" className="portfolio-chapters">
          {leadingChapters.map((chapter) => (
            <Chapter key={chapter.id} {...chapter} />
          ))}
          {pairedChapterRows.length > 0 && (
            <div className="portfolio-chapter-pairs">
              {pairedChapterRows.map((row) => (
                <div key={row.map((chapter) => chapter.id).join("-")} className="portfolio-chapter-pair" data-chapter-count={row.length}>
                  {row.map((chapter) => <Chapter key={chapter.id} {...chapter} />)}
                </div>
              ))}
            </div>
          )}
        </div>

        <AdaptivePortfolioGallery photos={galleryPhotos} />

        {trailingChapters.length > 0 && (
          <div className="portfolio-chapters portfolio-chapters-trailing">
            {trailingChapters.map((chapter) => <Chapter key={chapter.id} {...chapter} />)}
          </div>
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
            ) : !ownerPreview && interestAction ? (
              interestAction
            ) : null}
          </section>
        )}
      </main>

      <footer className="portfolio-footer">
        <div><Sparkles aria-hidden="true" /><strong>Nakshatra</strong></div>
        <p>One clear wedding portfolio.</p>
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
  hasApprovedAccess,
}: {
  data: PortfolioData;
  blurredPhotos: number;
  hasApprovedAccess: boolean;
}) {
  if (hasApprovedAccess) return [];
  const labels: string[] = [];
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

function firstName(value?: string) {
  return clean(value)?.split(/\s+/)[0] || "this profile";
}

function privacyLabel(mode: PortfolioData["privacy_mode"]) {
  if (mode === "private") return "Short introduction";
  return "Standard introduction";
}

function preferenceCommunity(preferences?: PortfolioData["preferences"]) {
  const choice = clean(preferences?.caste_preference);
  if (!choice) return undefined;
  if (choice === "open") return "Open to all communities";
  if (choice === "not_applicable") return "Not applicable";
  if (choice === "prefer_not_to_say") return "Prefer not to say";
  if (choice === "specific") return clean(preferences?.specific_communities) || "Open to specific communities";
  return choice;
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

function validDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return undefined;
  return value;
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
    data.personal.dob,
    data.astrology?.time_of_birth,
    data.personal.place_of_birth,
    data.astrology?.lagnam,
  ]);
}

function normalizedContacts(contact?: PortfolioData["contact"]) {
  if (contact?.contacts?.length) return contact.contacts.filter((item) => clean(item.name) && (clean(item.phone) || clean(item.email)));
  if (clean(contact?.contact_person) && (clean(contact?.phone) || clean(contact?.email))) {
    return [{ relationship: "", name: contact?.contact_person, phone: contact?.phone, email: contact?.email }];
  }
  return [];
}
