"use client";

import { useId, useState, type HTMLInputTypeAttribute, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LockKeyhole,
  Moon,
  ShieldCheck,
  Sun,
  Trash2,
} from "lucide-react";
import { LocationFields, type LocationValue } from "@/components/portfolio/LocationFields";
import { CELESTIAL_THEME_COLORS } from "@/features/portfolio/celestial-theme";
import {
  AGE_OPTIONS,
  CASTE_PREFERENCE_OPTIONS,
  CHILDREN_OPTIONS,
  COMMUNITY_OPTIONS,
  CURRENCY_OPTIONS,
  DIET_OPTIONS,
  FREQUENCY_OPTIONS,
  GENDER_OPTIONS,
  GIFT_EXPECTATION_OPTIONS,
  HEIGHT_OPTIONS,
  HOBBY_OPTIONS,
  HOROSCOPE_PREFERENCE_OPTIONS,
  INCOME_RANGE_OPTIONS,
  JOB_TYPE_OPTIONS,
  LANGUAGE_OPTIONS,
  MANGLIK_OPTIONS,
  MARRIAGE_TIMELINE_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  NAKSHATRA_OPTIONS,
  PARENT_SUPPORT_OPTIONS,
  PROFILE_FOR_OPTIONS,
  QUALIFICATION_OPTIONS,
  RELOCATION_OPTIONS,
  RELIGION_OPTIONS,
  SIBLING_POSITION_OPTIONS,
  VISA_OPTIONS,
  WEDDING_EXPECTATION_OPTIONS,
  type BlueprintOption,
} from "@/features/portfolio/blueprint-options";
import { RASHI_OPTIONS, type PortfolioData } from "@/types/portfolio";

type UpdatePortfolioSection = <K extends keyof PortfolioData>(
  key: K,
  value: PortfolioData[K]
) => void;

type SectionId =
  | "foundation"
  | "story"
  | "work"
  | "family"
  | "lifestyle"
  | "preferences"
  | "future"
  | "astrology"
  | "privacy";

const SECTIONS: Array<{ id: SectionId; label: string; optional?: boolean }> = [
  { id: "foundation", label: "The basics" },
  { id: "story", label: "About you", optional: true },
  { id: "work", label: "Education & work", optional: true },
  { id: "family", label: "Family", optional: true },
  { id: "astrology", label: "Astrology", optional: true },
  { id: "lifestyle", label: "Lifestyle", optional: true },
  { id: "preferences", label: "Partner preferences", optional: true },
  { id: "future", label: "Looking ahead", optional: true },
  { id: "privacy", label: "Privacy & contact" },
];

const RASHI_SELECT_OPTIONS: BlueprintOption[] = [
  { value: "", label: "Select rashi" },
  ...RASHI_OPTIONS.map((rashi) => ({ value: rashi.key, label: rashi.label })),
];

const PRIVACY_PRESETS = [
  {
    value: "balanced" as const,
    label: "Balanced",
    description: "Your story, journey, interests, family introduction, and selected astrology are visible. Sensitive details still require your approval.",
    icon: ShieldCheck,
  },
  {
    value: "private" as const,
    label: "Private",
    description: "Only a brief introduction is visible until you approve an introduction request.",
    icon: LockKeyhole,
  },
];

const CONTACT_RELATIONSHIPS: BlueprintOption[] = [
  { value: "self", label: "Self" },
  { value: "father", label: "Father" },
  { value: "mother", label: "Mother" },
  { value: "guardian", label: "Guardian" },
  { value: "sibling", label: "Sibling" },
  { value: "other", label: "Other" },
];

export function BlueprintForm({
  data,
  onUpdate,
  photoManager,
  horoscopeManager,
}: {
  data: PortfolioData;
  onUpdate: UpdatePortfolioSection;
  photoManager?: ReactNode;
  horoscopeManager?: ReactNode;
}) {
  const [activeSection, setActiveSection] = useState<SectionId>("foundation");
  const activeIndex = SECTIONS.findIndex((section) => section.id === activeSection);
  const foundationFields = [
    data.personal.name,
    data.personal.dob,
    data.personal.gender,
    data.personal.country && data.personal.city ? `${data.personal.city}, ${data.personal.country}` : "",
    data.career?.title,
    data.personal.short_bio || data.personal.profile_summary,
  ];
  const foundationReady = foundationFields.filter(hasValue).length;
  const contacts = data.contact?.contacts?.length
    ? data.contact.contacts
    : data.contact?.contact_person || data.contact?.phone || data.contact?.email
      ? [{
          relationship: "self",
          name: data.contact.contact_person,
          phone: data.contact.phone,
          email: data.contact.email,
        }]
      : [];

  function updatePersonal(changes: Partial<PortfolioData["personal"]>) {
    const next = { ...data.personal, ...changes };
    if ("country" in changes || "region" in changes || "city" in changes) {
      next.current_location = [next.city, next.region, next.country].filter(Boolean).join(", ");
    }
    onUpdate("personal", next);
  }

  function updateResidence(changes: LocationValue) {
    updatePersonal({
      ...("country" in changes && { country: changes.country }),
      ...("countryCode" in changes && { country_code: changes.countryCode }),
      ...("region" in changes && { region: changes.region }),
      ...("regionCode" in changes && { region_code: changes.regionCode }),
      ...("city" in changes && { city: changes.city }),
      ...("cityGeonameId" in changes && { city_geoname_id: changes.cityGeonameId }),
    });
  }

  function updateFamily(changes: Partial<NonNullable<PortfolioData["family"]>>) {
    onUpdate("family", { ...(data.family || {}), ...changes });
  }

  function setSiblingCount(rawValue: string) {
    const count = Math.min(10, Math.max(0, Number(rawValue) || 0));
    const previous = data.family?.siblings || [];
    const siblings = Array.from({ length: count }, (_, index) => previous[index] || {});
    updateFamily({ sibling_count: count, siblings });
  }

  function updateSibling(index: number, changes: Record<string, string>) {
    const siblings = [...(data.family?.siblings || [])];
    siblings[index] = { ...(siblings[index] || {}), ...changes };
    updateFamily({ siblings });
  }

  function updateContacts(nextContacts: typeof contacts) {
    onUpdate("contact", { ...(data.contact || {}), contacts: nextContacts });
  }

  function setAppearance(appearance: "light" | "dark") {
    onUpdate("style", {
      ...(data.style || {}),
      appearance,
      template_name: "Celestial Union",
      theme_color: CELESTIAL_THEME_COLORS[appearance].background,
    });
  }

  function goTo(section: SectionId) {
    setActiveSection(section);
    const stage = document.getElementById("blueprint-stage");
    if (stage && typeof stage.scrollIntoView === "function") {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      stage.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    }
  }

  return (
    <div className="biodata-editor grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="hidden lg:sticky lg:top-0 lg:block lg:self-start">
        <div className="biodata-editor-sidebar rounded-2xl p-3">
          <div className="biodata-editor-progress mb-3 rounded-xl p-3">
            <p className="text-sm font-semibold text-[color:var(--workspace-teal)]">
              {foundationReady === foundationFields.length ? "Ready to preview" : "Start with the essentials"}
            </p>
            <p className="mt-1 text-sm leading-5 text-[color:var(--workspace-ink-muted)]">
              {foundationReady} of {foundationFields.length} essentials complete
            </p>
          </div>
          <nav aria-label="Biodata form sections" className="space-y-1">
            {SECTIONS.map((section, index) => {
              const selected = section.id === activeSection;
              return (
                <button
                  key={section.id}
                  type="button"
                  aria-current={selected ? "step" : undefined}
                  onClick={() => goTo(section.id)}
                  className={`workspace-focus flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    selected ? "bg-[color:var(--workspace-teal-soft)] text-[color:var(--workspace-ink)]" : "text-[color:var(--workspace-ink-muted)] hover:bg-[color:var(--workspace-surface-muted)] hover:text-[color:var(--workspace-ink)]"
                  }`}
                >
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs ${selected ? "border-[color:var(--workspace-teal)] text-[color:var(--workspace-teal)]" : "border-[color:var(--workspace-border)]"}`}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-sm font-semibold">{section.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      <div id="blueprint-stage" className="min-w-0 scroll-mt-4">
        <div className="biodata-editor-mobile-nav sticky top-0 z-30 mb-4 rounded-xl p-3 lg:hidden">
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <strong className="text-[color:var(--workspace-ink)]">Section {activeIndex + 1} of {SECTIONS.length}</strong>
            <span className="text-[color:var(--workspace-ink-muted)]">{foundationReady} of {foundationFields.length} essentials</span>
          </div>
          <div
            className="mb-3 h-1.5 overflow-hidden rounded-full bg-[color:var(--workspace-border)]"
            role="progressbar"
            aria-label="Biodata completion steps"
            aria-valuemin={1}
            aria-valuemax={SECTIONS.length}
            aria-valuenow={activeIndex + 1}
          >
            <span className="block h-full rounded-full bg-[color:var(--workspace-teal)]" style={{ width: `${((activeIndex + 1) / SECTIONS.length) * 100}%` }} />
          </div>
          <label className="grid gap-1.5 text-sm font-semibold text-[color:var(--workspace-ink)]">
            Go to section
            <select
              aria-label="Go to biodata section"
              value={activeSection}
              onChange={(event) => goTo(event.target.value as SectionId)}
              className="biodata-field min-h-12"
            >
              {SECTIONS.map((section, index) => (
                <option key={section.id} value={section.id}>{index + 1}. {section.label}{section.optional ? " (optional)" : ""}</option>
              ))}
            </select>
          </label>
        </div>
        {activeSection === "foundation" && (
          <FormSection eyebrow="Start here" title="Biodata essentials" description="Complete these first. You can save your draft and return to every optional section later.">
            <InfoCard title="You control what gets shared" audience="Private draft" text="These answers create your biodata. Nothing becomes public until you publish, and protected details stay outside the public introduction." />
            <SelectInput label="Who are you creating this biodata for?" value={data.personal.profile_for || ""} options={PROFILE_FOR_OPTIONS} onChange={(value) => updatePersonal({ profile_for: value })} requirement="Recommended" audience="Only you" />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label="Full name" value={data.personal.name || ""} onChange={(value) => updatePersonal({ name: value })} required requirement="Required" audience="Portfolio" />
              <TextInput label="Preferred name" value={data.personal.preferred_name || ""} onChange={(value) => updatePersonal({ preferred_name: value })} audience="Public introduction" hint="The name friends and family usually use." />
            </div>
            <TextArea label="Short introduction" value={data.personal.short_bio || ""} onChange={(value) => updatePersonal({ short_bio: value })} maxLength={240} required requirement="Required" audience="Public introduction" hint="Write one or two warm sentences shown beside the main photo. A fuller story can come later." />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <TextInput label="Date of birth" type="date" value={data.personal.dob || ""} onChange={(value) => updatePersonal({ dob: value })} required requirement="Required" audience="Protected" hint="Used to calculate age. The exact date is not public." />
              <SelectInput label="Gender" value={data.personal.gender || ""} options={GENDER_OPTIONS} onChange={(value) => updatePersonal({ gender: value as PortfolioData["personal"]["gender"] })} required requirement="Required" audience="Portfolio" />
              <TextInput label="Profession or role" value={data.career?.title || ""} onChange={(value) => onUpdate("career", { ...(data.career || {}), title: value })} required requirement="Required" audience="Portfolio" hint="A broad role is enough; employer details can come later." />
              <SelectInput label="Height" value={data.vitals?.height || ""} options={HEIGHT_OPTIONS} onChange={(value) => onUpdate("vitals", { ...(data.vitals || {}), height: value })} requirement="Optional" audience="Portfolio" />
              <SelectInput label="Marital status" value={data.personal.marital_status || ""} options={MARITAL_STATUS_OPTIONS} onChange={(value) => updatePersonal({ marital_status: value })} requirement="Recommended" audience="Approved people" />
            </div>
            <LocationFields value={{ country: data.personal.country, countryCode: data.personal.country_code, region: data.personal.region, regionCode: data.personal.region_code, city: data.personal.city, cityGeonameId: data.personal.city_geoname_id }} onChange={updateResidence} labels={{ country: "Current country", region: "Current state or region", city: "Current city" }} requireCountryAndCity />
            {photoManager && <EmbeddedPanel title="Photos" description="Choose a portrait and gallery moments.">{photoManager}</EmbeddedPanel>}
          </FormSection>
        )}

        {activeSection === "story" && (
          <FormSection eyebrow="Your voice" title="About you" description="Use your own words. A warm, specific answer is more helpful than a formal résumé-style summary.">
            <TextArea label="What would you like someone to understand about you?" value={data.personal.profile_summary || ""} onChange={(value) => updatePersonal({ profile_summary: value })} maxLength={1600} requirement="Recommended" audience="Portfolio" hint="A natural personal story, not a resume summary." />
            <TextArea label="What kind of life are you building?" value={data.personal.long_term_goals || ""} onChange={(value) => updatePersonal({ long_term_goals: value })} maxLength={1200} requirement="Optional" audience="Portfolio" hint="Share the direction that matters to you: family, work, learning, community, or something else." />
            <TextArea label="What would you enjoy doing together?" value={data.personal.shared_life_plans || ""} onChange={(value) => updatePersonal({ shared_life_plans: value })} maxLength={1200} requirement="Optional" audience="Portfolio" hint="Small everyday hopes are often more meaningful than a perfect answer." />
          </FormSection>
        )}

        {activeSection === "work" && (
          <FormSection eyebrow="Journey" title="Education and work" description="Share the level of detail that helps someone understand your path and present situation.">
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectInput label="Highest qualification" value={data.education?.qualification_level || ""} options={QUALIFICATION_OPTIONS} onChange={(value) => onUpdate("education", { ...(data.education || {}), qualification_level: value })} requirement="Recommended" audience="Portfolio" />
              <TextInput label="Degree or qualification" value={data.education?.degree || ""} onChange={(value) => onUpdate("education", { ...(data.education || {}), degree: value })} requirement="Optional" audience="Portfolio" />
              <TextInput label="Institution" value={data.education?.institution || ""} onChange={(value) => onUpdate("education", { ...(data.education || {}), institution: value })} requirement="Optional" audience="Portfolio" />
              <TextInput label="Education location" value={data.education?.location || ""} onChange={(value) => onUpdate("education", { ...(data.education || {}), location: value })} requirement="Optional" audience="Portfolio" />
              <SelectInput label="Work status" value={data.career?.job_type || ""} options={JOB_TYPE_OPTIONS} onChange={(value) => onUpdate("career", { ...(data.career || {}), job_type: value })} requirement="Optional" audience="Portfolio" />
              <TextInput label="Employer or organisation" value={data.career?.company || ""} onChange={(value) => onUpdate("career", { ...(data.career || {}), company: value })} audience="Approved people" />
              <TextInput label="Work location" value={data.career?.location || ""} onChange={(value) => onUpdate("career", { ...(data.career || {}), location: value })} requirement="Optional" audience="Portfolio" />
              <SelectInput label="Visa or residency status" value={data.personal.immigration_status || ""} options={VISA_OPTIONS} onChange={(value) => updatePersonal({ immigration_status: value })} audience="Approved people" />
              <TextInput label="Citizenship" value={data.personal.citizenship || ""} onChange={(value) => updatePersonal({ citizenship: value })} requirement="Optional" audience="Approved people" />
              <SelectInput label="Annual income range" value={data.career?.annual_income || ""} options={INCOME_RANGE_OPTIONS} onChange={(value) => onUpdate("career", { ...(data.career || {}), annual_income: value })} audience="Protected" hint="Never shown publicly." />
              {hasValue(data.career?.annual_income) && data.career?.annual_income !== "Prefer not to say" && <SelectInput label="Income currency" value={data.career?.income_currency || ""} options={CURRENCY_OPTIONS} onChange={(value) => onUpdate("career", { ...(data.career || {}), income_currency: value })} audience="Protected" />}
            </div>
            <TextArea label="Where would you like your career to grow?" value={data.career?.career_goals || ""} onChange={(value) => onUpdate("career", { ...(data.career || {}), career_goals: value })} maxLength={800} requirement="Optional" audience="Approved people" />
          </FormSection>
        )}

        {activeSection === "family" && (
          <FormSection eyebrow="Roots" title="Family and background" description="Introduce your family in a warm, respectful way. Personal contact details remain protected.">
            <TextArea label="How would you describe your family?" value={data.family?.public_summary || ""} onChange={(value) => updateFamily({ public_summary: value })} maxLength={600} requirement="Recommended" audience="Portfolio" hint="Describe the family without phone numbers, exact addresses, or private documents." />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectInput label="Religion or outlook" value={data.personal.religion || ""} options={RELIGION_OPTIONS} onChange={(value) => updatePersonal({ religion: value })} requirement="Optional" audience="Approved people" />
              <TextInput label="Community" value={data.personal.community || ""} onChange={(value) => updatePersonal({ community: value })} list="community-options" requirement="Optional" audience="Approved people" />
              <TextInput label="Sub-community" value={data.personal.sub_community || ""} onChange={(value) => updatePersonal({ sub_community: value })} requirement="Optional" audience="Approved people" />
              <TextInput label="Parents' current location" value={data.family?.parents_location || ""} onChange={(value) => updateFamily({ parents_location: value })} requirement="Optional" audience="Approved people" />
              <TextInput label="Father or guardian name" value={data.family?.father?.name || ""} onChange={(value) => updateFamily({ father: { ...(data.family?.father || {}), name: value } })} requirement="Optional" audience="Approved people" />
              <TextInput label="Father or guardian profession" value={data.family?.father?.occupation || ""} onChange={(value) => updateFamily({ father: { ...(data.family?.father || {}), occupation: value } })} requirement="Optional" audience="Approved people" />
              <TextInput label="Mother or guardian name" value={data.family?.mother?.name || ""} onChange={(value) => updateFamily({ mother: { ...(data.family?.mother || {}), name: value } })} requirement="Optional" audience="Approved people" />
              <TextInput label="Mother or guardian profession" value={data.family?.mother?.occupation || ""} onChange={(value) => updateFamily({ mother: { ...(data.family?.mother || {}), occupation: value } })} requirement="Optional" audience="Approved people" />
              <TextInput label="Paternal family origin" value={data.family?.paternal_origin || data.family?.ancestral_origin || ""} onChange={(value) => updateFamily({ paternal_origin: value })} requirement="Optional" audience="Portfolio" />
              <TextInput label="Maternal family origin" value={data.family?.maternal_origin || ""} onChange={(value) => updateFamily({ maternal_origin: value })} requirement="Optional" audience="Portfolio" />
              <TextInput label="Number of siblings" type="number" min="0" max="10" value={String(data.family?.sibling_count ?? "")} onChange={setSiblingCount} requirement="Optional" audience="Approved people" />
              <SelectInput label="Your position among siblings" value={data.family?.sibling_position || ""} options={SIBLING_POSITION_OPTIONS} onChange={(value) => updateFamily({ sibling_position: value })} requirement="Optional" audience="Approved people" />
            </div>
            {(data.family?.siblings || []).map((sibling, index) => (
              <div key={index} className="rounded-xl border border-[color:var(--workspace-border)] bg-[color:var(--workspace-surface-muted)] p-4">
                <p className="mb-3 text-base font-semibold text-[color:var(--workspace-ink)]">Sibling {index + 1} <span className="ml-2 text-sm font-normal text-[color:var(--workspace-ink-muted)]">Optional details</span></p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextInput label="Name" value={sibling.name || ""} onChange={(value) => updateSibling(index, { name: value })} audience="Approved people" />
                  <TextInput label="Occupation" value={sibling.occupation || ""} onChange={(value) => updateSibling(index, { occupation: value })} audience="Approved people" />
                  <TextInput label="Location" value={sibling.location || ""} onChange={(value) => updateSibling(index, { location: value })} audience="Approved people" />
                  <SelectInput label="Marital status" value={sibling.marital_status || ""} options={MARITAL_STATUS_OPTIONS} onChange={(value) => updateSibling(index, { marital_status: value })} audience="Approved people" />
                </div>
              </div>
            ))}
            <datalist id="community-options">{COMMUNITY_OPTIONS.filter((item) => item.value).map((item) => <option key={item.value} value={item.value} />)}</datalist>
          </FormSection>
        )}

        {activeSection === "lifestyle" && (
          <FormSection eyebrow="Everyday life" title="Lifestyle and interests" description="Choose what genuinely reflects you.">
            <div className="grid gap-4 sm:grid-cols-3">
              <SelectInput label="Dietary preference" value={data.lifestyle?.diet || ""} options={DIET_OPTIONS} onChange={(value) => onUpdate("lifestyle", { ...(data.lifestyle || {}), diet: value })} requirement="Optional" audience="Portfolio" />
              <SelectInput label="Alcohol use" value={data.lifestyle?.drinking || ""} options={FREQUENCY_OPTIONS} onChange={(value) => onUpdate("lifestyle", { ...(data.lifestyle || {}), drinking: value })} requirement="Optional" audience="Approved people" />
              <SelectInput label="Tobacco use" value={data.lifestyle?.smoking || ""} options={FREQUENCY_OPTIONS} onChange={(value) => onUpdate("lifestyle", { ...(data.lifestyle || {}), smoking: value })} requirement="Optional" audience="Approved people" />
            </div>
            <MultiSelectInput label="Languages" value={data.lifestyle?.languages || ""} options={LANGUAGE_OPTIONS} onChange={(value) => onUpdate("lifestyle", { ...(data.lifestyle || {}), languages: value })} audience="Portfolio" />
            <MultiSelectInput label="Interests and hobbies" value={data.lifestyle?.hobbies || ""} options={HOBBY_OPTIONS} onChange={(value) => onUpdate("lifestyle", { ...(data.lifestyle || {}), hobbies: value })} audience="Portfolio" />
            <TextArea label="Which values guide your everyday life?" value={data.lifestyle?.values_statement || ""} onChange={(value) => onUpdate("lifestyle", { ...(data.lifestyle || {}), values_statement: value })} maxLength={1200} requirement="Optional" audience="Portfolio" />
          </FormSection>
        )}

        {activeSection === "preferences" && (
          <FormSection eyebrow="Compatibility" title="Partner preferences" description="Share thoughtful preferences without making the section feel like a screening checklist. These answers are shown only after approval.">
            <TextArea label="What qualities would support a good partnership?" value={data.preferences?.narrative || ""} onChange={(value) => onUpdate("preferences", { ...(data.preferences || {}), narrative: value })} maxLength={1200} requirement="Recommended" audience="Approved people" />
            <div className="grid gap-4 sm:grid-cols-2">
              <RangeSelectInput label="Preferred age range" value={data.preferences?.age_range || ""} options={AGE_OPTIONS} onChange={(value) => onUpdate("preferences", { ...(data.preferences || {}), age_range: value })} audience="Approved people" />
              <RangeSelectInput label="Preferred height range" value={data.preferences?.height_range || ""} options={HEIGHT_OPTIONS} onChange={(value) => onUpdate("preferences", { ...(data.preferences || {}), height_range: value })} audience="Approved people" />
              <SelectInput label="Community preference" value={data.preferences?.caste_preference || ""} options={CASTE_PREFERENCE_OPTIONS} onChange={(value) => onUpdate("preferences", { ...(data.preferences || {}), caste_preference: value, ...(value !== "specific" && { specific_communities: "" }) })} requirement="Optional" audience="Approved people" />
              <SelectInput label="Horoscope matching preference" value={data.preferences?.horoscope_preference || ""} options={HOROSCOPE_PREFERENCE_OPTIONS} onChange={(value) => onUpdate("preferences", { ...(data.preferences || {}), horoscope_preference: value })} requirement="Optional" audience="Approved people" />
            </div>
            {data.preferences?.caste_preference === "specific" && <MultiSelectInput label="Specific communities" value={data.preferences?.specific_communities || ""} options={COMMUNITY_OPTIONS.filter((item) => item.value)} onChange={(value) => onUpdate("preferences", { ...(data.preferences || {}), specific_communities: value })} audience="Approved people" />}
            <MultiSelectInput label="Preferred locations" value={data.preferences?.location_preferences || ""} options={[]} onChange={(value) => onUpdate("preferences", { ...(data.preferences || {}), location_preferences: value })} audience="Approved people" hint="Add cities, states, or countries that would work for you." allowCustom />
            <MultiSelectInput label="Preferred visa or residency statuses" value={data.preferences?.visa_preferences || ""} options={VISA_OPTIONS.filter((item) => item.value)} onChange={(value) => onUpdate("preferences", { ...(data.preferences || {}), visa_preferences: value })} audience="Approved people" hint="Useful only when international location compatibility matters." />
          </FormSection>
        )}

        {activeSection === "future" && (
          <FormSection eyebrow="Looking ahead" title="Future plans" description="These are conversation starters, not commitments. Choose only what you are comfortable sharing.">
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectInput label="When would you ideally like to marry?" value={data.preferences?.marriage_timeline || ""} options={MARRIAGE_TIMELINE_OPTIONS} onChange={(value) => onUpdate("preferences", { ...(data.preferences || {}), marriage_timeline: value })} requirement="Optional" audience="Approved people" />
              <SelectInput label="How do you feel about having children?" value={data.preferences?.children_preference || ""} options={CHILDREN_OPTIONS} onChange={(value) => onUpdate("preferences", { ...(data.preferences || {}), children_preference: value })} requirement="Optional" audience="Approved people" />
              <SelectInput label="Would you consider relocating after marriage?" value={data.personal.relocation_preference || ""} options={RELOCATION_OPTIONS} onChange={(value) => updatePersonal({ relocation_preference: value })} requirement="Optional" audience="Approved people" />
              <SelectInput label="What kind of wedding feels right to you?" value={data.preferences?.wedding_expectations || ""} options={WEDDING_EXPECTATION_OPTIONS} onChange={(value) => onUpdate("preferences", { ...(data.preferences || {}), wedding_expectations: value })} requirement="Optional" audience="Approved people" />
              <SelectInput label="Wedding expenses and gift expectations" value={data.preferences?.gift_expectations || ""} options={GIFT_EXPECTATION_OPTIONS} onChange={(value) => onUpdate("preferences", { ...(data.preferences || {}), gift_expectations: value })} requirement="Optional" audience="Protected" />
              <SelectInput label="How do you imagine supporting parents after marriage?" value={data.preferences?.parent_support || ""} options={PARENT_SUPPORT_OPTIONS} onChange={(value) => onUpdate("preferences", { ...(data.preferences || {}), parent_support: value })} requirement="Optional" audience="Protected" />
            </div>
          </FormSection>
        )}

        {activeSection === "astrology" && (
          <FormSection eyebrow="Cultural alignment" title="Astrology" description="Add only what you know. Sensitive details stay protected.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <TextInput label="Time of birth" type="time" value={data.astrology?.time_of_birth || ""} onChange={(value) => onUpdate("astrology", { ...(data.astrology || {}), time_of_birth: value })} requirement="Optional" audience="Protected" />
              <TextInput label="Place of birth" value={data.personal.place_of_birth || ""} onChange={(value) => updatePersonal({ place_of_birth: value })} requirement="Optional" audience="Protected" />
              <SelectInput label="Rashi" value={data.astrology?.rashi || ""} options={RASHI_SELECT_OPTIONS} onChange={(value) => onUpdate("astrology", { ...(data.astrology || {}), rashi: value as NonNullable<PortfolioData["astrology"]>["rashi"] })} requirement="Optional" audience="Portfolio, if you choose" />
              <SelectInput label="Nakshatra" value={data.astrology?.nakshatra || ""} options={NAKSHATRA_OPTIONS} onChange={(value) => onUpdate("astrology", { ...(data.astrology || {}), nakshatra: value })} requirement="Optional" audience="Approved people" />
              <TextInput label="Pada" value={data.astrology?.pada || ""} onChange={(value) => onUpdate("astrology", { ...(data.astrology || {}), pada: value })} requirement="Optional" audience="Approved people" />
              <TextInput label="Lagnam" value={data.astrology?.lagnam || ""} onChange={(value) => onUpdate("astrology", { ...(data.astrology || {}), lagnam: value })} requirement="Optional" audience="Protected" />
              <TextInput label="Gotra" value={data.vitals?.gotra || ""} onChange={(value) => onUpdate("vitals", { ...(data.vitals || {}), gotra: value })} requirement="Optional" audience="Protected" />
              <TextInput label="Maternal gotra" value={data.astrology?.maternal_gotra || ""} onChange={(value) => onUpdate("astrology", { ...(data.astrology || {}), maternal_gotra: value })} requirement="Optional" audience="Protected" />
              <SelectInput label="Manglik status" value={data.astrology?.manglik_status || ""} options={MANGLIK_OPTIONS} onChange={(value) => onUpdate("astrology", { ...(data.astrology || {}), manglik_status: value })} requirement="Optional" audience="Approved people" />
            </div>
            {horoscopeManager && <EmbeddedPanel title="Original horoscope attachment" description="Approved people can open it as a separate document.">{horoscopeManager}</EmbeddedPanel>}
          </FormSection>
        )}

        {activeSection === "privacy" && (
          <FormSection eyebrow="Before publishing" title="Privacy and sharing" description="Choose the appearance and how much the public introduction reveals.">
            <InfoCard title="Sensitive details stay protected" audience="Never public" text="Exact birth details, contact information, income, and the horoscope are not shown in the public introduction." />
            <div>
              <p className="mb-1 text-base font-semibold text-[color:var(--workspace-ink)]">Biodata appearance</p>
              <p className="mb-3 text-sm leading-6 text-[color:var(--workspace-ink-muted)]">This changes the published biodata only. Your Nakshatra workspace always stays light.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {(["light", "dark"] as const).map((appearance) => {
                  const selected = (data.style?.appearance || "light") === appearance;
                  const Icon = appearance === "light" ? Sun : Moon;
                  return <button key={appearance} type="button" aria-pressed={selected} onClick={() => setAppearance(appearance)} className={`workspace-focus min-h-20 rounded-xl border p-4 text-left transition-colors ${selected ? "border-[color:var(--workspace-teal)] bg-[color:var(--workspace-teal-soft)]" : "border-[color:var(--workspace-border)] bg-white hover:border-[#9eaaa5]"}`}><span className="flex items-center gap-3 text-base font-semibold text-[color:var(--workspace-ink)]"><Icon className="h-5 w-5 text-[color:var(--workspace-teal)]" aria-hidden="true" />{appearance === "light" ? "Light" : "Dark"}{selected && <Check className="ml-auto h-5 w-5 text-[color:var(--workspace-teal)]" aria-hidden="true" />}</span></button>;
                })}
              </div>
            </div>
            <div>
              <p className="mb-1 text-base font-semibold text-[color:var(--workspace-ink)]">Who can see what</p>
              <p className="mb-3 text-sm leading-6 text-[color:var(--workspace-ink-muted)]">You can review the public introduction before publishing. Contact, income, and exact birth details are never public.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {PRIVACY_PRESETS.map((preset) => {
                  const selectedMode = data.privacy_mode === "private" ? "private" : "balanced";
                  const selected = selectedMode === preset.value;
                  const Icon = preset.icon;
                  return <button key={preset.value} type="button" aria-pressed={selected} onClick={() => onUpdate("privacy_mode", preset.value)} className={`workspace-focus min-h-40 rounded-xl border p-5 text-left transition-colors ${selected ? "border-[color:var(--workspace-teal)] bg-[color:var(--workspace-teal-soft)]" : "border-[color:var(--workspace-border)] bg-white hover:border-[#9eaaa5]"}`}><span className="flex items-center gap-3 text-base font-semibold text-[color:var(--workspace-ink)]"><Icon className="h-5 w-5 text-[color:var(--workspace-teal)]" aria-hidden="true" />{preset.label}{preset.value === "balanced" && <span className="rounded-full border border-[#b7cbc6] bg-white px-2 py-1 text-xs font-semibold text-[color:var(--workspace-teal)]">Recommended</span>}{selected && <Check className="ml-auto h-5 w-5 text-[color:var(--workspace-teal)]" aria-hidden="true" />}</span><span className="mt-3 block text-sm leading-6 text-[color:var(--workspace-ink-muted)]">{preset.description}</span></button>;
                })}
              </div>
            </div>
            <div className="space-y-4 border-t border-[color:var(--workspace-border)] pt-5">
              <InfoCard title="Protected contact" audience="Optional · Never public" text="Add a preferred contact only if you want one ready for approved introductions." />
              {contacts.map((contact, index) => (
                <div key={index} className="rounded-xl border border-[color:var(--workspace-border)] bg-[color:var(--workspace-surface-muted)] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-base font-semibold text-[color:var(--workspace-ink)]">Protected contact {index + 1}</p>
                    <button type="button" onClick={() => updateContacts(contacts.filter((_, itemIndex) => itemIndex !== index))} className="workspace-focus inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#9f2f2f] hover:bg-[#fff0ee]"><Trash2 className="h-4 w-4" aria-hidden="true" /> Remove</button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <SelectInput label="Who is this?" value={contact.relationship || "self"} options={CONTACT_RELATIONSHIPS} onChange={(value) => updateContacts(contacts.map((item, itemIndex) => itemIndex === index ? { ...item, relationship: value } : item))} audience="Protected" />
                    <TextInput label="Name of contact" value={contact.name || ""} onChange={(value) => updateContacts(contacts.map((item, itemIndex) => itemIndex === index ? { ...item, name: value } : item))} audience="Protected" />
                    <TextInput label="Phone" type="tel" value={contact.phone || ""} onChange={(value) => updateContacts(contacts.map((item, itemIndex) => itemIndex === index ? { ...item, phone: value } : item))} audience="Protected" hint="Provide a phone number, an email, or both." />
                    <TextInput label="Email" type="email" value={contact.email || ""} onChange={(value) => updateContacts(contacts.map((item, itemIndex) => itemIndex === index ? { ...item, email: value } : item))} audience="Protected" />
                  </div>
                </div>
              ))}
              {contacts.length < 5 && <button type="button" onClick={() => updateContacts([...contacts, { relationship: contacts.length ? "other" : "self", name: "", phone: "", email: "" }])} className="workspace-focus min-h-12 rounded-lg border border-[color:var(--workspace-border)] bg-white px-4 text-sm font-semibold text-[color:var(--workspace-ink)] hover:bg-[color:var(--workspace-surface-muted)]">{contacts.length ? "Add another protected contact" : "Add a protected contact"}</button>}
            </div>
          </FormSection>
        )}

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-[color:var(--workspace-border)] pt-5">
          <button type="button" disabled={activeIndex === 0} onClick={() => goTo(SECTIONS[activeIndex - 1].id)} className="workspace-focus inline-flex min-h-12 items-center gap-2 rounded-lg border border-[color:var(--workspace-border)] bg-white px-4 text-sm font-semibold text-[color:var(--workspace-ink)] hover:bg-[color:var(--workspace-surface-muted)] disabled:invisible"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Previous</button>
          <p className="hidden text-sm text-[color:var(--workspace-ink-muted)] sm:block">You can change saved answers at any time.</p>
          {activeIndex < SECTIONS.length - 1 ? (
            <button type="button" onClick={() => goTo(SECTIONS[activeIndex + 1].id)} className="workspace-focus inline-flex min-h-12 items-center gap-2 rounded-lg bg-[color:var(--workspace-navy)] px-5 text-sm font-semibold text-white hover:bg-[#183d59]">{SECTIONS[activeIndex + 1].optional ? "Continue" : "Review privacy"}<ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
          ) : <span className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--workspace-teal)]"><Check className="h-4 w-4" aria-hidden="true" /> Ready to save</span>}
        </div>
      </div>
    </div>
  );
}

function FormSection({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  return <section className="biodata-editor-card space-y-6 rounded-2xl p-5 sm:p-7"><div><p className="text-sm font-semibold text-[color:var(--workspace-teal)]">{eyebrow}</p><h3 className="mt-2 text-2xl font-semibold text-[color:var(--workspace-ink)]">{title}</h3><p className="mt-2 max-w-3xl text-base leading-7 text-[color:var(--workspace-ink-muted)]">{description}</p></div>{children}</section>;
}

function InfoCard({ title, text, audience }: { title: string; text: string; audience: string }) {
  return <div className="rounded-xl border border-[#bdd5d0] bg-[#eef5f2] p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-[color:var(--workspace-teal)]" aria-hidden="true" /><div><p className="text-base font-semibold text-[color:var(--workspace-ink)]">{title}</p><p className="mt-1 text-sm leading-6 text-[color:var(--workspace-ink-muted)]">{text}</p><span className="mt-3 inline-flex rounded-full border border-[#b7cbc6] bg-white px-2.5 py-1 text-xs font-semibold text-[color:var(--workspace-ink)]">{audience}</span></div></div></div>;
}

function EmbeddedPanel({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <div className="rounded-xl border border-[color:var(--workspace-border)] bg-[color:var(--workspace-surface-muted)] p-4"><div className="mb-4"><p className="text-base font-semibold text-[color:var(--workspace-ink)]">{title}</p><p className="mt-1 text-sm leading-6 text-[color:var(--workspace-ink-muted)]">{description}</p></div>{children}</div>;
}

function FieldLabel({ label, hint, required, requirement, audience }: { label: string; hint?: string; required?: boolean; requirement?: string; audience?: string }) {
  const visibleRequirement = required ? "Required" : requirement || "Optional";
  const visibleAudience = audience ? audienceCopy(audience) : undefined;
  return <span><span className="flex flex-wrap items-center gap-2"><span>{label}{required && <span className="ml-1 text-[color:var(--workspace-teal)]" aria-hidden="true">*</span>}</span>{visibleRequirement && <span className="rounded-full border border-[color:var(--workspace-border)] bg-white px-2 py-0.5 text-xs font-semibold text-[color:var(--workspace-ink-muted)]">{visibleRequirement}</span>}</span>{visibleAudience && <span className="mt-1 block text-xs font-medium text-[color:var(--workspace-teal)]">Visible: {visibleAudience}</span>}{hint && <span className="mt-1 block text-sm font-normal leading-5 text-[color:var(--workspace-ink-muted)]">{hint}</span>}</span>;
}

function TextInput({ label, value, onChange, type = "text", placeholder, hint, required, min, max, requirement, audience, list, name }: { label: string; value: string; onChange: (value: string) => void; type?: HTMLInputTypeAttribute; placeholder?: string; hint?: string; required?: boolean; min?: string; max?: string; requirement?: string; audience?: string; list?: string; name?: string }) {
  const id = useId();
  const resolvedName = name || label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return <label htmlFor={id} className="flex flex-col gap-2 text-[15px] font-semibold text-[color:var(--workspace-ink)]"><FieldLabel label={label} hint={hint} required={required} requirement={requirement} audience={audience} /><input id={id} name={resolvedName} aria-label={label} type={type} value={value} placeholder={placeholder} required={required} min={min} max={max} list={list} autoComplete={type === "email" ? "email" : type === "tel" ? "tel" : "off"} spellCheck={type === "email" ? false : undefined} onChange={(event) => onChange(event.target.value)} className="biodata-field min-h-12" /></label>;
}

function TextArea({ label, value, onChange, hint, required, maxLength, requirement, audience }: { label: string; value: string; onChange: (value: string) => void; hint?: string; required?: boolean; maxLength?: number; requirement?: string; audience?: string }) {
  const id = useId();
  return <label htmlFor={id} className="flex flex-col gap-2 text-[15px] font-semibold text-[color:var(--workspace-ink)]"><FieldLabel label={label} hint={hint} required={required} requirement={requirement} audience={audience} /><textarea id={id} name={label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")} aria-label={label} value={value} required={required} maxLength={maxLength} autoComplete="off" onChange={(event) => onChange(event.target.value)} rows={4} className="biodata-field min-h-32 resize-y py-3 leading-7" />{maxLength && <span className="self-end text-xs font-normal text-[color:var(--workspace-ink-muted)]">{value.length} of {maxLength} characters</span>}</label>;
}

function SelectInput({ label, value, options, onChange, required, requirement, audience, hint }: { label: string; value: string; options: BlueprintOption[]; onChange: (value: string) => void; required?: boolean; requirement?: string; audience?: string; hint?: string }) {
  const resolvedOptions = value && !options.some((item) => item.value === value)
    ? [{ value, label: `${value} (current)` }, ...options]
    : options;
  const id = useId();
  return <label htmlFor={id} className="flex flex-col gap-2 text-[15px] font-semibold text-[color:var(--workspace-ink)]"><FieldLabel label={label} hint={hint} required={required} requirement={requirement} audience={audience} /><select id={id} name={label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")} aria-label={label} value={value} required={required} onChange={(event) => onChange(event.target.value)} className="biodata-field min-h-12">{resolvedOptions.map((item) => <option key={`${item.value}-${item.label}`} value={item.value}>{item.label}</option>)}</select></label>;
}

function RangeSelectInput({ label, value, options, onChange, audience }: { label: string; value: string; options: BlueprintOption[]; onChange: (value: string) => void; audience?: string }) {
  const range = parseRange(value, options);
  const subject = label.toLowerCase().includes("height") ? "height" : "age";
  const legacyValue = value && !range.minimum && !range.maximum ? value : undefined;
  const selectable = options.filter((item) => item.value);
  const minimumOptions = [{ value: "", label: "No minimum" }, ...selectable];
  const maximumOptions = [{ value: "", label: "No maximum" }, ...selectable];
  return (
    <fieldset className="space-y-3 rounded-xl border border-[color:var(--workspace-border)] bg-[color:var(--workspace-surface-muted)] p-4">
      <legend className="px-1 text-[15px] font-semibold text-[color:var(--workspace-ink)]"><FieldLabel label={label} audience={audience} /></legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectInput label={`Minimum ${subject}`} value={range.minimum} options={minimumOptions} onChange={(minimum) => onChange(updateRange(range, "minimum", minimum, selectable))} />
        <SelectInput label={`Maximum ${subject}`} value={range.maximum} options={maximumOptions} onChange={(maximum) => onChange(updateRange(range, "maximum", maximum, selectable))} />
      </div>
      {legacyValue && <p className="text-sm text-[color:var(--workspace-ink-muted)]">Previous entry: {legacyValue}. Choose a minimum and maximum to replace it.</p>}
      {(range.minimum || range.maximum) && <button type="button" onClick={() => onChange("")} className="workspace-focus min-h-11 rounded-lg px-2 text-sm font-semibold text-[color:var(--workspace-teal)] hover:text-[color:var(--workspace-navy)]">Clear range</button>}
    </fieldset>
  );
}

function MultiSelectInput({ label, value, options, onChange, audience, hint, allowCustom = true }: { label: string; value: string; options: BlueprintOption[]; onChange: (value: string) => void; audience?: string; hint?: string; allowCustom?: boolean }) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const values = splitValues(value);
  const listId = useId();
  const query = draft.trim().toLowerCase();
  const available = options.filter((item) => item.value && !values.some((selected) => selected.toLowerCase() === item.value.toLowerCase()));
  const suggestions = available.filter((item) => !query || item.label.toLowerCase().includes(query)).slice(0, 12);
  function addValue(selectedValue?: string) {
    const match = available.find((item) => item.value.toLowerCase() === (selectedValue || draft.trim()).toLowerCase());
    const next = match?.value || (allowCustom ? (selectedValue || draft.trim()) : "");
    if (!next || values.some((item) => item.toLowerCase() === next.toLowerCase())) return;
    onChange([...values, next].join(", "));
    setDraft("");
    setOpen(false);
  }
  return <div className="space-y-2 text-[15px] font-semibold text-[color:var(--workspace-ink)]"><FieldLabel label={label} hint={hint} audience={audience} /><div className="flex flex-col gap-2 sm:flex-row"><div className="relative min-w-0 flex-1" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}><input name={label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")} autoComplete="off" aria-label={label} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={listId} value={draft} onFocus={() => setOpen(true)} onChange={(event) => { setDraft(event.target.value); setOpen(true); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addValue(); } else if (event.key === "Escape") { setOpen(false); } }} placeholder="Search or type to add…" className="biodata-field min-h-12 w-full" />{open && suggestions.length > 0 && <ul id={listId} role="listbox" aria-label={`${label} suggestions`} className="absolute inset-x-0 top-full z-40 mt-2 max-h-64 overflow-y-auto rounded-xl border border-[color:var(--workspace-border)] bg-white p-1.5 shadow-2xl shadow-[#233443]/15">{suggestions.map((item) => <li key={item.value} role="none"><button type="button" role="option" aria-selected="false" onMouseDown={(event) => event.preventDefault()} onClick={() => addValue(item.value)} className="workspace-focus min-h-11 w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[color:var(--workspace-ink)] hover:bg-[color:var(--workspace-teal-soft)]">{item.label}</button></li>)}</ul>}</div><button type="button" onClick={() => addValue()} className="workspace-focus min-h-12 rounded-lg border border-[color:var(--workspace-border)] bg-white px-5 text-sm font-semibold text-[color:var(--workspace-ink)] hover:bg-[color:var(--workspace-surface-muted)]">Add</button></div>{values.length > 0 && <div className="flex flex-wrap gap-2" aria-label={`${label} selected`}>{values.map((item) => <button key={item} type="button" onClick={() => onChange(values.filter((valueItem) => valueItem !== item).join(", "))} className="workspace-focus inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[#b7cbc6] bg-[#eef5f2] px-3 text-sm font-medium text-[color:var(--workspace-ink)]" aria-label={`Remove ${item}`}>{item}<span aria-hidden="true">×</span></button>)}</div>}</div>;
}

function parseRange(value: string, options: BlueprintOption[]) {
  const allowed = new Set(options.filter((item) => item.value).map((item) => item.value));
  const [minimum = "", maximum = ""] = value.split(/\s*(?:–|—|\bto\b|-)\s*/i, 2);
  return {
    minimum: allowed.has(minimum) ? minimum : "",
    maximum: allowed.has(maximum) ? maximum : "",
  };
}

function updateRange(range: { minimum: string; maximum: string }, boundary: "minimum" | "maximum", nextValue: string, options: BlueprintOption[]) {
  let minimum = boundary === "minimum" ? nextValue : range.minimum;
  let maximum = boundary === "maximum" ? nextValue : range.maximum;
  if (minimum && !maximum && boundary === "minimum") maximum = minimum;
  if (maximum && !minimum && boundary === "maximum") minimum = maximum;
  const order = new Map(options.map((item, index) => [item.value, index]));
  if (minimum && maximum && (order.get(minimum) ?? 0) > (order.get(maximum) ?? 0)) {
    if (boundary === "minimum") maximum = minimum;
    else minimum = maximum;
  }
  return minimum || maximum ? `${minimum}–${maximum}` : "";
}

function splitValues(value: string) {
  return Array.from(new Set(value.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean)));
}

function audienceCopy(audience: string) {
  if (audience === "Portfolio") return "public introduction";
  if (audience === "Portfolio, if you choose") return "public when selected";
  if (audience === "Approved people") return "after you approve an introduction";
  if (audience === "Protected") return "not in the public introduction";
  if (audience === "Only you") return "only you";
  return audience.toLowerCase();
}

function hasValue(value: unknown) {
  return typeof value === "string" ? Boolean(value.trim()) : value !== undefined && value !== null;
}
