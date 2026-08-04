"use client";

import { useState, type HTMLInputTypeAttribute, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  LockKeyhole,
  Moon,
  ShieldCheck,
  Sun,
  Trash2,
} from "lucide-react";
import { LocationFields, type LocationValue } from "@/components/portfolio/LocationFields";
import { CELESTIAL_THEME_COLORS } from "@/features/portfolio/celestial-theme";
import {
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

const SECTIONS: Array<{ id: SectionId; label: string; description: string; optional?: boolean }> = [
  { id: "foundation", label: "Foundation", description: "What your portfolio needs first" },
  { id: "story", label: "Your story", description: "A more human introduction", optional: true },
  { id: "work", label: "Education & work", description: "Your journey and present", optional: true },
  { id: "family", label: "Family", description: "Roots and background", optional: true },
  { id: "lifestyle", label: "Lifestyle", description: "Interests and everyday life", optional: true },
  { id: "preferences", label: "Preferences", description: "What compatibility means to you", optional: true },
  { id: "future", label: "Future plans", description: "Important life conversations", optional: true },
  { id: "astrology", label: "Astrology", description: "Structured details and horoscope", optional: true },
  { id: "privacy", label: "Privacy & contact", description: "Review how sharing works" },
];

const RASHI_SELECT_OPTIONS: BlueprintOption[] = [
  { value: "", label: "Select rashi" },
  ...RASHI_OPTIONS.map((rashi) => ({ value: rashi.key, label: rashi.label })),
];

const PRIVACY_PRESETS = [
  {
    value: "progressive" as const,
    label: "Balanced",
    description: "A thoughtful introduction is visible. Sensitive detail requires your approval.",
    icon: ShieldCheck,
  },
  {
    value: "private" as const,
    label: "Private",
    description: "Only a brief introduction is visible until you approve an interest request.",
    icon: LockKeyhole,
  },
  {
    value: "open" as const,
    label: "Open",
    description: "More portfolio detail is visible, while contact and exact birth details stay protected.",
    icon: Eye,
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
  const isFamilyCreated = ["son", "daughter", "sibling", "relative"].includes(
    data.personal.profile_for || ""
  );
  const candidateName = data.personal.preferred_name || data.personal.name || "this person";
  const foundationFields = [
    data.personal.name,
    data.personal.dob,
    data.personal.gender,
    data.personal.current_location,
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
      ...(changes.country !== undefined && { country: changes.country }),
      ...(changes.countryCode !== undefined && { country_code: changes.countryCode }),
      ...(changes.region !== undefined && { region: changes.region }),
      ...(changes.regionCode !== undefined && { region_code: changes.regionCode }),
      ...(changes.city !== undefined && { city: changes.city }),
      ...(changes.cityGeonameId !== undefined && { city_geoname_id: changes.cityGeonameId }),
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
      stage.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-0 lg:self-start">
        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
          <div className="mb-3 rounded-xl border border-[#f4d98f]/20 bg-[#f4d98f]/8 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#f4d98f]">
              {foundationReady === foundationFields.length ? "Ready to preview" : "Start with the essentials"}
            </p>
            <p className="mt-1 text-xs leading-5 text-white/55">
              Foundation {foundationReady} of {foundationFields.length}. Everything after that can be completed when it feels useful.
            </p>
          </div>
          <nav aria-label="Portfolio form sections" className="space-y-1">
            {SECTIONS.map((section, index) => {
              const selected = section.id === activeSection;
              return (
                <button
                  key={section.id}
                  type="button"
                  aria-current={selected ? "step" : undefined}
                  onClick={() => goTo(section.id)}
                  className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                    selected ? "bg-[#f4d98f]/12 text-white" : "text-white/55 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${selected ? "border-[#f4d98f] text-[#f4d98f]" : "border-white/15"}`}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{section.label}</span>
                    <span className="mt-0.5 block text-[11px] leading-4 text-white/40">{section.description}</span>
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      <div id="blueprint-stage" className="min-w-0 scroll-mt-4">
        <div className="mb-5 flex gap-3 rounded-xl border border-[#f4d98f]/20 bg-[#f4d98f]/7 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#f4d98f]" />
          <div>
            <p className="text-sm font-semibold text-white">Build the portfolio first. Add depth at your pace.</p>
            <p className="mt-1 text-xs leading-5 text-white/60">
              {isFamilyCreated
                ? `You are creating this for ${candidateName}. Sensitive answers remain protected even when they help give approved viewers better context.`
                : "Every question says how it helps and who can see it. Optional answers can be skipped without losing your work."}
            </p>
          </div>
        </div>

        {activeSection === "foundation" && (
          <FormSection eyebrow="Start here" title="A portfolio worth previewing" description="These six details create the first useful version. Exact birth information stays protected even though age can be shown.">
            <SelectInput label="Who is creating this profile?" value={data.personal.profile_for || ""} options={PROFILE_FOR_OPTIONS} onChange={(value) => updatePersonal({ profile_for: value })} requirement="Recommended" audience="Only you" hint="This helps us phrase the form correctly. It is not shown in the portfolio." />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label="Full name" value={data.personal.name || ""} onChange={(value) => updatePersonal({ name: value })} required requirement="Required" audience="Portfolio" hint="Used as the portfolio heading." />
              <TextInput label="Preferred name" value={data.personal.preferred_name || ""} onChange={(value) => updatePersonal({ preferred_name: value })} requirement="Optional" audience="Portfolio" hint="Use this when you would rather show a shorter name." />
            </div>
            <TextArea label="Short introduction" value={data.personal.short_bio || ""} onChange={(value) => updatePersonal({ short_bio: value })} maxLength={240} required requirement="Required" audience="Portfolio" hint="One or two warm sentences shown beside the main photo. You can write the fuller story later." />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <TextInput label="Date of birth" type="date" value={data.personal.dob || ""} onChange={(value) => updatePersonal({ dob: value })} required requirement="Required" audience="Protected" hint="Used to calculate age. The exact date is not public." />
              <SelectInput label="Gender" value={data.personal.gender || ""} options={GENDER_OPTIONS} onChange={(value) => updatePersonal({ gender: value as PortfolioData["personal"]["gender"] })} required requirement="Required" audience="Portfolio" />
              <TextInput label="Profession or role" value={data.career?.title || ""} onChange={(value) => onUpdate("career", { ...(data.career || {}), title: value })} required requirement="Required" audience="Portfolio" hint="A broad role is enough; employer details can come later." />
              <SelectInput label="Height" value={data.vitals?.height || ""} options={HEIGHT_OPTIONS} onChange={(value) => onUpdate("vitals", { ...(data.vitals || {}), height: value })} requirement="Optional" audience="Portfolio" />
              <SelectInput label="Marital status" value={data.personal.marital_status || ""} options={MARITAL_STATUS_OPTIONS} onChange={(value) => updatePersonal({ marital_status: value })} requirement="Recommended" audience="Approved people" />
            </div>
            <InfoCard title="Why we ask for location" audience="Portfolio" text="A city or broad location gives immediate practical context. Exact addresses are never requested here." />
            <LocationFields value={{ country: data.personal.country, countryCode: data.personal.country_code, region: data.personal.region, regionCode: data.personal.region_code, city: data.personal.city, cityGeonameId: data.personal.city_geoname_id }} onChange={updateResidence} labels={{ country: "Current country", region: "Current state or region", city: "Current city" }} />
            {photoManager && <EmbeddedPanel title="Photos" description="Choose the portrait and gallery images that make the portfolio feel personal.">{photoManager}</EmbeddedPanel>}
          </FormSection>
        )}

        {activeSection === "story" && (
          <FormSection eyebrow="Your voice" title="Help someone understand the person behind the facts" description="These prompts become distinct portfolio moments. Write one now or return whenever you have the words.">
            <TextArea label="What would you like someone to understand about you?" value={data.personal.profile_summary || ""} onChange={(value) => updatePersonal({ profile_summary: value })} maxLength={1600} requirement="Recommended" audience="Portfolio" hint="A natural personal story, not a resume summary." />
            <TextArea label="What kind of life are you building?" value={data.personal.long_term_goals || ""} onChange={(value) => updatePersonal({ long_term_goals: value })} maxLength={1200} requirement="Optional" audience="Portfolio" hint="Share the direction that matters to you: family, work, learning, community, or something else." />
            <TextArea label="What would you enjoy doing together?" value={data.personal.shared_life_plans || ""} onChange={(value) => updatePersonal({ shared_life_plans: value })} maxLength={1200} requirement="Optional" audience="Portfolio" hint="Small everyday hopes are often more meaningful than a perfect answer." />
          </FormSection>
        )}

        {activeSection === "work" && (
          <FormSection eyebrow="Journey" title="Education and work" description="Add only the detail that helps someone understand your path. Employer and financial details are never needed for a first preview.">
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectInput label="Highest qualification" value={data.education?.qualification_level || ""} options={QUALIFICATION_OPTIONS} onChange={(value) => onUpdate("education", { ...(data.education || {}), qualification_level: value })} requirement="Recommended" audience="Portfolio" />
              <TextInput label="Degree or qualification" value={data.education?.degree || ""} onChange={(value) => onUpdate("education", { ...(data.education || {}), degree: value })} requirement="Optional" audience="Portfolio" />
              <TextInput label="Institution" value={data.education?.institution || ""} onChange={(value) => onUpdate("education", { ...(data.education || {}), institution: value })} requirement="Optional" audience="Portfolio" />
              <TextInput label="Education location" value={data.education?.location || ""} onChange={(value) => onUpdate("education", { ...(data.education || {}), location: value })} requirement="Optional" audience="Portfolio" />
              <SelectInput label="Work status" value={data.career?.job_type || ""} options={JOB_TYPE_OPTIONS} onChange={(value) => onUpdate("career", { ...(data.career || {}), job_type: value })} requirement="Optional" audience="Portfolio" />
              <TextInput label="Employer or organisation" value={data.career?.company || ""} onChange={(value) => onUpdate("career", { ...(data.career || {}), company: value })} requirement="Optional" audience="Approved people" hint="Useful context, but more specific than your public role." />
              <TextInput label="Work location" value={data.career?.location || ""} onChange={(value) => onUpdate("career", { ...(data.career || {}), location: value })} requirement="Optional" audience="Portfolio" />
              <SelectInput label="Visa or residency status" value={data.personal.immigration_status || ""} options={VISA_OPTIONS} onChange={(value) => updatePersonal({ immigration_status: value })} requirement="Optional" audience="Approved people" hint="Useful for relocation and location compatibility." />
              <TextInput label="Citizenship" value={data.personal.citizenship || ""} onChange={(value) => updatePersonal({ citizenship: value })} requirement="Optional" audience="Approved people" />
              <TextInput label="Annual income" value={data.career?.annual_income || ""} onChange={(value) => onUpdate("career", { ...(data.career || {}), annual_income: value })} requirement="Optional" audience="Protected" hint="Never shown publicly. Leave blank if you prefer." />
              {hasValue(data.career?.annual_income) && <SelectInput label="Income currency" value={data.career?.income_currency || ""} options={CURRENCY_OPTIONS} onChange={(value) => onUpdate("career", { ...(data.career || {}), income_currency: value })} requirement="Optional" audience="Protected" />}
            </div>
            <TextArea label="Where would you like your career to grow?" value={data.career?.career_goals || ""} onChange={(value) => onUpdate("career", { ...(data.career || {}), career_goals: value })} maxLength={800} requirement="Optional" audience="Approved people" />
          </FormSection>
        )}

        {activeSection === "family" && (
          <FormSection eyebrow="Roots" title="Family and background" description="Begin with a warm, non-identifying summary. Names and exact family details are protected and entirely optional.">
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
              <div key={index} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-3 text-sm font-semibold text-white">Sibling {index + 1} <span className="ml-2 text-xs font-normal text-white/40">Optional details</span></p>
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
          <FormSection eyebrow="Everyday life" title="Lifestyle and interests" description="Selections make this quicker to complete and help your portfolio feel specific without requiring long answers.">
            <div className="grid gap-4 sm:grid-cols-3">
              <SelectInput label="Dietary preference" value={data.lifestyle?.diet || ""} options={DIET_OPTIONS} onChange={(value) => onUpdate("lifestyle", { ...(data.lifestyle || {}), diet: value })} requirement="Optional" audience="Portfolio" />
              <SelectInput label="Drinking" value={data.lifestyle?.drinking || ""} options={FREQUENCY_OPTIONS} onChange={(value) => onUpdate("lifestyle", { ...(data.lifestyle || {}), drinking: value })} requirement="Optional" audience="Approved people" />
              <SelectInput label="Smoking" value={data.lifestyle?.smoking || ""} options={FREQUENCY_OPTIONS} onChange={(value) => onUpdate("lifestyle", { ...(data.lifestyle || {}), smoking: value })} requirement="Optional" audience="Approved people" />
            </div>
            <MultiSelectInput label="Languages" value={data.lifestyle?.languages || ""} options={LANGUAGE_OPTIONS} onChange={(value) => onUpdate("lifestyle", { ...(data.lifestyle || {}), languages: value })} audience="Portfolio" hint="Search and add one language at a time." />
            <MultiSelectInput label="Interests and hobbies" value={data.lifestyle?.hobbies || ""} options={HOBBY_OPTIONS} onChange={(value) => onUpdate("lifestyle", { ...(data.lifestyle || {}), hobbies: value })} audience="Portfolio" hint="A few genuine interests are enough." />
            <TextArea label="Which values guide your everyday life?" value={data.lifestyle?.values_statement || ""} onChange={(value) => onUpdate("lifestyle", { ...(data.lifestyle || {}), values_statement: value })} maxLength={1200} requirement="Optional" audience="Portfolio" />
          </FormSection>
        )}

        {activeSection === "preferences" && (
          <FormSection eyebrow="Compatibility" title="Relationship preferences" description="These answers provide context for approved people. They do not become a public checklist.">
            <TextArea label="What qualities would support a good partnership?" value={data.preferences?.narrative || ""} onChange={(value) => onUpdate("preferences", { ...(data.preferences || {}), narrative: value })} maxLength={1200} requirement="Recommended" audience="Approved people" hint="Describe values and compatibility respectfully rather than listing demands." />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label="Preferred age range" value={data.preferences?.age_range || ""} onChange={(value) => onUpdate("preferences", { ...(data.preferences || {}), age_range: value })} placeholder="For example, 28–34" requirement="Optional" audience="Approved people" />
              <TextInput label="Preferred height range" value={data.preferences?.height_range || ""} onChange={(value) => onUpdate("preferences", { ...(data.preferences || {}), height_range: value })} requirement="Optional" audience="Approved people" />
              <SelectInput label="Community preference" value={data.preferences?.caste_preference || ""} options={CASTE_PREFERENCE_OPTIONS} onChange={(value) => onUpdate("preferences", { ...(data.preferences || {}), caste_preference: value, ...(value !== "specific" && { specific_communities: "" }) })} requirement="Optional" audience="Approved people" />
              <SelectInput label="Horoscope matching preference" value={data.preferences?.horoscope_preference || ""} options={HOROSCOPE_PREFERENCE_OPTIONS} onChange={(value) => onUpdate("preferences", { ...(data.preferences || {}), horoscope_preference: value })} requirement="Optional" audience="Approved people" />
            </div>
            {data.preferences?.caste_preference === "specific" && <MultiSelectInput label="Specific communities" value={data.preferences?.specific_communities || ""} options={COMMUNITY_OPTIONS.filter((item) => item.value)} onChange={(value) => onUpdate("preferences", { ...(data.preferences || {}), specific_communities: value })} audience="Approved people" />}
            <MultiSelectInput label="Preferred locations" value={data.preferences?.location_preferences || ""} options={[]} onChange={(value) => onUpdate("preferences", { ...(data.preferences || {}), location_preferences: value })} audience="Approved people" hint="Add cities, states, or countries that would work for you." allowCustom />
            <MultiSelectInput label="Preferred visa or residency statuses" value={data.preferences?.visa_preferences || ""} options={VISA_OPTIONS.filter((item) => item.value)} onChange={(value) => onUpdate("preferences", { ...(data.preferences || {}), visa_preferences: value })} audience="Approved people" hint="Useful only when international location compatibility matters." />
          </FormSection>
        )}

        {activeSection === "future" && (
          <FormSection eyebrow="Looking ahead" title="Future plans" description="These are conversation starters, not promises. Choose “discuss” or leave an answer blank whenever that is more honest.">
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
          <FormSection eyebrow="Cultural alignment" title="Astrology" description="Structured fields prevent confusion. Exact birth time, place, gotra, and the uploaded original remain available only to approved viewers.">
            <InfoCard title="Structured details and original horoscope serve different purposes" audience="Approved people" text="Enter only details you know. The attachment is presented as the original document and is never treated as a replacement for these fields." />
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
            {horoscopeManager && <EmbeddedPanel title="Original horoscope attachment" description="Optional. Approved people can open it as a separate document; it is never shown on the public portfolio.">{horoscopeManager}</EmbeddedPanel>}
          </FormSection>
        )}

        {activeSection === "privacy" && (
          <FormSection eyebrow="Before publishing" title="Privacy and sharing" description="Choose the Celestial Union appearance and decide how much context the public portfolio reveals. Balanced is the recommended starting point.">
            <InfoCard title="Your public link is an introduction, not a complete matrimonial record" audience="Always protected" text="Exact birth details, direct contact, income, and the horoscope attachment do not become public when you choose Open." />
            <div>
              <p className="mb-1 text-sm font-medium text-white">Celestial Union appearance</p>
              <p className="mb-3 text-xs leading-5 text-white/45">This changes only light or dark presentation. There are no legacy palettes or separate templates.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {(["light", "dark"] as const).map((appearance) => {
                  const selected = (data.style?.appearance || "light") === appearance;
                  const Icon = appearance === "light" ? Sun : Moon;
                  return <button key={appearance} type="button" aria-pressed={selected} onClick={() => setAppearance(appearance)} className={`min-h-14 rounded-xl border p-4 text-left transition ${selected ? "border-[#f4d98f] bg-[#f4d98f]/12" : "border-white/10 bg-white/[0.03] hover:border-white/30"}`}><span className="flex items-center gap-2 text-sm font-semibold text-white"><Icon className="h-4 w-4 text-[#f4d98f]" />{appearance === "light" ? "Light" : "Dark"}</span></button>;
                })}
              </div>
            </div>
            <div>
              <p className="mb-3 text-sm font-medium text-white">Privacy mode</p>
              <div className="grid gap-3 xl:grid-cols-3">
                {PRIVACY_PRESETS.map((preset) => {
                  const selected = (data.privacy_mode || "progressive") === preset.value;
                  const Icon = preset.icon;
                  return <button key={preset.value} type="button" aria-pressed={selected} onClick={() => onUpdate("privacy_mode", preset.value)} className={`rounded-xl border p-4 text-left transition ${selected ? "border-[#f4d98f] bg-[#f4d98f]/12" : "border-white/10 bg-white/[0.03] hover:border-white/30"}`}><span className="flex items-center gap-2 text-sm font-semibold text-white"><Icon className="h-4 w-4 text-[#f4d98f]" />{preset.label}{preset.value === "progressive" && <span className="rounded-full bg-[#f4d98f]/15 px-2 py-0.5 text-[9px] uppercase tracking-wide text-[#f4d98f]">Recommended</span>}</span><span className="mt-2 block text-xs leading-5 text-white/55">{preset.description}</span></button>;
                })}
              </div>
            </div>
            <div className="space-y-4 border-t border-white/10 pt-5">
              <InfoCard title="Who should an approved introduction contact?" audience="Optional · Never public" text="Add yourself, a parent, guardian, or relative only if you want Nakshatra to keep a preferred contact ready. It is not shown in public or preview views. When approved-access requests are enabled, you will still decide whether to share it." />
              {contacts.map((contact, index) => (
                <div key={index} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">Protected contact {index + 1}</p>
                    <button type="button" onClick={() => updateContacts(contacts.filter((_, itemIndex) => itemIndex !== index))} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs text-white/65 hover:bg-white/5 hover:text-white"><Trash2 className="h-4 w-4" /> Remove</button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <SelectInput label="Who is this?" value={contact.relationship || "self"} options={CONTACT_RELATIONSHIPS} onChange={(value) => updateContacts(contacts.map((item, itemIndex) => itemIndex === index ? { ...item, relationship: value } : item))} audience="Protected" />
                    <TextInput label="Name of contact" value={contact.name || ""} onChange={(value) => updateContacts(contacts.map((item, itemIndex) => itemIndex === index ? { ...item, name: value } : item))} audience="Protected" />
                    <TextInput label="Phone" type="tel" value={contact.phone || ""} onChange={(value) => updateContacts(contacts.map((item, itemIndex) => itemIndex === index ? { ...item, phone: value } : item))} audience="Protected" hint="Provide a phone number, an email, or both." />
                    <TextInput label="Email" type="email" value={contact.email || ""} onChange={(value) => updateContacts(contacts.map((item, itemIndex) => itemIndex === index ? { ...item, email: value } : item))} audience="Protected" />
                  </div>
                </div>
              ))}
              {contacts.length < 5 && <button type="button" onClick={() => updateContacts([...contacts, { relationship: contacts.length ? "other" : "self", name: "", phone: "", email: "" }])} className="min-h-11 rounded-lg border border-white/15 px-4 text-sm font-semibold text-white hover:border-white/35">{contacts.length ? "Add another protected contact" : "Add a protected contact"}</button>}
            </div>
          </FormSection>
        )}

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-5">
          <button type="button" disabled={activeIndex === 0} onClick={() => goTo(SECTIONS[activeIndex - 1].id)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/15 px-4 text-sm font-semibold text-white disabled:invisible"><ArrowLeft className="h-4 w-4" /> Previous</button>
          <p className="hidden text-xs text-white/40 sm:block">Saved answers can be changed any time.</p>
          {activeIndex < SECTIONS.length - 1 ? (
            <button type="button" onClick={() => goTo(SECTIONS[activeIndex + 1].id)} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#f4d98f] px-4 text-sm font-semibold text-[#17151c]">{SECTIONS[activeIndex + 1].optional ? "Continue" : "Review privacy"}<ArrowRight className="h-4 w-4" /></button>
          ) : <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#f4d98f]"><Check className="h-4 w-4" /> Ready to save</span>}
        </div>
      </div>
    </div>
  );
}

function FormSection({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  return <section className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f4d98f]">{eyebrow}</p><h3 className="mt-2 text-xl font-semibold text-white">{title}</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">{description}</p></div>{children}</section>;
}

function InfoCard({ title, text, audience }: { title: string; text: string; audience: string }) {
  return <div className="rounded-xl border border-[#78a9a1]/20 bg-[#78a9a1]/8 p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#9fc9c1]" /><div><p className="text-sm font-semibold text-white">{title}</p><p className="mt-1 text-xs leading-5 text-white/55">{text}</p><span className="mt-2 inline-flex rounded-full border border-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/45">{audience}</span></div></div></div>;
}

function EmbeddedPanel({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <div className="rounded-xl border border-white/10 bg-black/10 p-4"><div className="mb-4"><p className="text-sm font-semibold text-white">{title}</p><p className="mt-1 text-xs leading-5 text-white/50">{description}</p></div>{children}</div>;
}

function FieldLabel({ label, hint, required, requirement = "Optional", audience }: { label: string; hint?: string; required?: boolean; requirement?: string; audience?: string }) {
  return <span><span className="flex flex-wrap items-center gap-1.5"><span>{label}{required && <span className="ml-1 text-[#f4d98f]">*</span>}</span><span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/40">{requirement}</span>{audience && <span className="rounded-full bg-[#78a9a1]/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#9fc9c1]">{audience}</span>}</span>{hint && <span className="mt-1 block text-xs font-normal leading-5 text-white/45">{hint}</span>}</span>;
}

function TextInput({ label, value, onChange, type = "text", placeholder, hint, required, min, max, requirement, audience, list }: { label: string; value: string; onChange: (value: string) => void; type?: HTMLInputTypeAttribute; placeholder?: string; hint?: string; required?: boolean; min?: string; max?: string; requirement?: string; audience?: string; list?: string }) {
  return <label className="flex flex-col gap-1.5 text-sm font-medium text-white/85"><FieldLabel label={label} hint={hint} required={required} requirement={requirement} audience={audience} /><input aria-label={label} type={type} value={value} placeholder={placeholder} required={required} min={min} max={max} list={list} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-normal text-white outline-none placeholder:text-white/30 focus:border-[#f4d98f]/60 focus:ring-2 focus:ring-[#f4d98f]/20" /></label>;
}

function TextArea({ label, value, onChange, hint, required, maxLength, requirement, audience }: { label: string; value: string; onChange: (value: string) => void; hint?: string; required?: boolean; maxLength?: number; requirement?: string; audience?: string }) {
  return <label className="flex flex-col gap-1.5 text-sm font-medium text-white/85"><FieldLabel label={label} hint={hint} required={required} requirement={requirement} audience={audience} /><textarea aria-label={label} value={value} required={required} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} rows={4} className="resize-y rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-normal leading-6 text-white outline-none placeholder:text-white/30 focus:border-[#f4d98f]/60 focus:ring-2 focus:ring-[#f4d98f]/20" />{maxLength && <span className="self-end text-[10px] font-normal text-white/35">{value.length}/{maxLength}</span>}</label>;
}

function SelectInput({ label, value, options, onChange, required, requirement, audience, hint }: { label: string; value: string; options: BlueprintOption[]; onChange: (value: string) => void; required?: boolean; requirement?: string; audience?: string; hint?: string }) {
  return <label className="flex flex-col gap-1.5 text-sm font-medium text-white/85"><FieldLabel label={label} hint={hint} required={required} requirement={requirement} audience={audience} /><select aria-label={label} value={value} required={required} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-lg border border-white/10 bg-[#20212e] px-3 text-sm font-normal text-white outline-none focus:border-[#f4d98f]/60 focus:ring-2 focus:ring-[#f4d98f]/20">{options.map((item) => <option key={`${item.value}-${item.label}`} value={item.value}>{item.label}</option>)}</select></label>;
}

function MultiSelectInput({ label, value, options, onChange, audience, hint, allowCustom = true }: { label: string; value: string; options: BlueprintOption[]; onChange: (value: string) => void; audience?: string; hint?: string; allowCustom?: boolean }) {
  const [draft, setDraft] = useState("");
  const values = splitValues(value);
  const available = options.filter((item) => item.value && !values.some((selected) => selected.toLowerCase() === item.value.toLowerCase()));
  const listId = `choices-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  function addValue() {
    const match = available.find((item) => item.value.toLowerCase() === draft.trim().toLowerCase());
    const next = match?.value || (allowCustom ? draft.trim() : "");
    if (!next || values.some((item) => item.toLowerCase() === next.toLowerCase())) return;
    onChange([...values, next].join(", "));
    setDraft("");
  }
  return <div className="space-y-2"><FieldLabel label={label} hint={hint} audience={audience} /><div className="flex gap-2"><input aria-label={label} value={draft} list={listId} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addValue(); } }} placeholder="Search or type to add" className="h-11 min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#f4d98f]/60" /><button type="button" onClick={addValue} className="h-11 rounded-lg border border-white/15 px-4 text-sm font-semibold text-white hover:bg-white/5">Add</button></div><datalist id={listId}>{available.map((item) => <option key={item.value} value={item.value} />)}</datalist>{values.length > 0 && <div className="flex flex-wrap gap-2" aria-label={`${label} selected`}>{values.map((item) => <button key={item} type="button" onClick={() => onChange(values.filter((valueItem) => valueItem !== item).join(", "))} className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[#78a9a1]/25 bg-[#78a9a1]/10 px-3 text-xs text-[#b7d7d1]" aria-label={`Remove ${item}`}>{item}<span aria-hidden="true">×</span></button>)}</div>}</div>;
}

function splitValues(value: string) {
  return Array.from(new Set(value.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean)));
}

function hasValue(value: unknown) {
  return typeof value === "string" ? Boolean(value.trim()) : value !== undefined && value !== null;
}
