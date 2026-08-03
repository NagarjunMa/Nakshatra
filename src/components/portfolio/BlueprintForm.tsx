"use client";

import { Eye, LockKeyhole, Moon, ShieldCheck, Sun, Trash2 } from "lucide-react";
import { LocationFields, type LocationValue } from "@/components/portfolio/LocationFields";
import { CELESTIAL_THEME_COLORS } from "@/features/portfolio/celestial-theme";
import {
  DIET_OPTIONS,
  GENDER_OPTIONS,
  HEIGHT_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  NAKSHATRA_OPTIONS,
  PROFILE_FOR_OPTIONS,
  QUALIFICATION_OPTIONS,
  VISA_OPTIONS,
  type BlueprintOption,
} from "@/features/portfolio/blueprint-options";
import { RASHI_OPTIONS, type PortfolioData } from "@/types/portfolio";

type UpdatePortfolioSection = <K extends keyof PortfolioData>(
  key: K,
  value: PortfolioData[K]
) => void;

const RASHI_SELECT_OPTIONS: BlueprintOption[] = [
  { value: "", label: "Select rashi" },
  ...RASHI_OPTIONS.map((rashi) => ({ value: rashi.key, label: rashi.label })),
];

const PRIVACY_PRESETS = [
  {
    value: "progressive" as const,
    label: "Balanced",
    description: "A helpful introduction is visible. Family, detailed astrology, and contact need approval.",
    icon: ShieldCheck,
  },
  {
    value: "private" as const,
    label: "Private",
    description: "Only a short introduction is visible until you approve an interest request.",
    icon: LockKeyhole,
  },
  {
    value: "open" as const,
    label: "Open",
    description: "More profile details are visible, while contact and highly sensitive information stay protected.",
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
}: {
  data: PortfolioData;
  onUpdate: UpdatePortfolioSection;
}) {
  const isFamilyCreated = ["son", "daughter", "sibling", "relative"].includes(
    data.personal.profile_for || ""
  );
  const candidateName = data.personal.preferred_name || data.personal.name || "this person";
  const contacts = data.contact?.contacts?.length
    ? data.contact.contacts
    : data.contact?.contact_person || data.contact?.phone || data.contact?.email
      ? [{
          relationship: "self",
          name: data.contact.contact_person,
          phone: data.contact.phone,
          email: data.contact.email,
        }]
      : [{ relationship: "self", name: "", phone: "", email: "" }];

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

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-[#f4d98f]/20 bg-[#f4d98f]/7 p-4">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#f4d98f]" />
          <div>
            <p className="text-sm font-semibold text-white">One dignified portfolio</p>
            <p className="mt-1 text-xs leading-5 text-white/60">
              {isFamilyCreated
                ? `You are creating this for ${candidateName}. Required information can still remain protected from viewers.`
                : "Required information helps complete the portfolio, but sensitive details are not automatically made public."}
            </p>
          </div>
        </div>
      </div>

      <FormSection number="01" title="Introduction" description="The first details viewers use to understand whose profile they are reading.">
        <SelectInput label="Who is creating this profile?" value={data.personal.profile_for || ""} options={PROFILE_FOR_OPTIONS} onChange={(value) => updatePersonal({ profile_for: value })} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="Full name" value={data.personal.name || ""} onChange={(value) => updatePersonal({ name: value })} required />
          <TextInput label="Preferred name" value={data.personal.preferred_name || ""} onChange={(value) => updatePersonal({ preferred_name: value })} hint="Optional - used in the portfolio heading." />
        </div>
        <TextArea label="Personal introduction" value={data.personal.profile_summary || ""} onChange={(value) => updatePersonal({ profile_summary: value })} required hint="A few warm, natural sentences are enough. This is not a resume summary." />
      </FormSection>

      <FormSection number="02" title="Personal details" description="Core facts used for a complete matrimonial profile. Privacy rules decide what a viewer receives.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TextInput label="Date of birth" type="date" value={data.personal.dob || ""} onChange={(value) => updatePersonal({ dob: value })} required />
          <SelectInput label="Gender" value={data.personal.gender || ""} options={GENDER_OPTIONS} onChange={(value) => updatePersonal({ gender: value as PortfolioData["personal"]["gender"] })} required />
          <SelectInput label="Height" value={data.vitals?.height || ""} options={HEIGHT_OPTIONS} onChange={(value) => onUpdate("vitals", { ...(data.vitals || {}), height: value })} required />
          <SelectInput label="Marital status" value={data.personal.marital_status || ""} options={MARITAL_STATUS_OPTIONS} onChange={(value) => updatePersonal({ marital_status: value })} />
          <SelectInput label="Visa or residency status" value={data.personal.immigration_status || ""} options={VISA_OPTIONS} onChange={(value) => updatePersonal({ immigration_status: value })} required />
          <TextInput label="Citizenship" value={data.personal.citizenship || ""} onChange={(value) => updatePersonal({ citizenship: value })} />
        </div>
        <LocationFields value={{ country: data.personal.country, countryCode: data.personal.country_code, region: data.personal.region, regionCode: data.personal.region_code, city: data.personal.city, cityGeonameId: data.personal.city_geoname_id }} onChange={updateResidence} labels={{ country: "Current country", region: "Current state or region", city: "Current city" }} />
      </FormSection>

      <FormSection number="03" title="Education and work" description="One clear education and current-work entry for the first version.">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectInput label="Highest qualification" value={data.education?.qualification_level || ""} options={QUALIFICATION_OPTIONS} onChange={(value) => onUpdate("education", { ...(data.education || {}), qualification_level: value })} />
          <TextInput label="Degree or qualification" value={data.education?.degree || ""} onChange={(value) => onUpdate("education", { ...(data.education || {}), degree: value })} required />
          <TextInput label="Institution" value={data.education?.institution || ""} onChange={(value) => onUpdate("education", { ...(data.education || {}), institution: value })} required />
          <TextInput label="Education location" value={data.education?.location || ""} onChange={(value) => onUpdate("education", { ...(data.education || {}), location: value })} />
          <TextInput label="Profession or role" value={data.career?.title || ""} onChange={(value) => onUpdate("career", { ...(data.career || {}), title: value })} required />
          <TextInput label="Employer or organisation" value={data.career?.company || ""} onChange={(value) => onUpdate("career", { ...(data.career || {}), company: value })} required />
          <TextInput label="Work location" value={data.career?.location || ""} onChange={(value) => onUpdate("career", { ...(data.career || {}), location: value })} required />
        </div>
      </FormSection>

      <FormSection number="04" title="Family" description="Family facts stay protected unless the chosen privacy mode explicitly shares a summary.">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="Father or guardian name" value={data.family?.father?.name || ""} onChange={(value) => updateFamily({ father: { ...(data.family?.father || {}), name: value } })} required />
          <TextInput label="Father or guardian occupation" value={data.family?.father?.occupation || ""} onChange={(value) => updateFamily({ father: { ...(data.family?.father || {}), occupation: value } })} required />
          <TextInput label="Mother or guardian name" value={data.family?.mother?.name || ""} onChange={(value) => updateFamily({ mother: { ...(data.family?.mother || {}), name: value } })} required />
          <TextInput label="Mother or guardian occupation" value={data.family?.mother?.occupation || ""} onChange={(value) => updateFamily({ mother: { ...(data.family?.mother || {}), occupation: value } })} required />
          <TextInput label="Paternal family origin" value={data.family?.paternal_origin || data.family?.ancestral_origin || ""} onChange={(value) => updateFamily({ paternal_origin: value })} required />
          <TextInput label="Maternal family origin" value={data.family?.maternal_origin || ""} onChange={(value) => updateFamily({ maternal_origin: value })} required />
          <TextInput label="Number of siblings" type="number" min="0" max="10" value={String(data.family?.sibling_count ?? "")} onChange={setSiblingCount} required />
          <TextInput label="Birth order" value={data.family?.sibling_position || ""} onChange={(value) => updateFamily({ sibling_position: value })} hint="Optional, for example: elder of two." />
        </div>
        {(data.family?.siblings || []).map((sibling, index) => (
          <div key={index} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <p className="mb-3 text-sm font-semibold text-white">Sibling {index + 1}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label="Name" value={sibling.name || ""} onChange={(value) => updateSibling(index, { name: value })} required />
              <TextInput label="Occupation" value={sibling.occupation || ""} onChange={(value) => updateSibling(index, { occupation: value })} required />
              <TextInput label="Location" value={sibling.location || ""} onChange={(value) => updateSibling(index, { location: value })} />
              <TextInput label="Marital status" value={sibling.marital_status || ""} onChange={(value) => updateSibling(index, { marital_status: value })} />
            </div>
          </div>
        ))}
        <TextArea label="Public family summary" value={data.family?.public_summary || ""} onChange={(value) => updateFamily({ public_summary: value })} hint="Optional. Describe the family warmly without names, phone numbers, or exact addresses." />
      </FormSection>

      <FormSection number="05" title="Lifestyle and preferences" description="Keep this concise. Optional fields disappear naturally when left empty.">
        <TextInput label="Languages known" value={data.lifestyle?.languages || ""} onChange={(value) => onUpdate("lifestyle", { ...(data.lifestyle || {}), languages: value })} placeholder="Kannada, English, Hindi" required />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectInput label="Diet" value={data.lifestyle?.diet || ""} options={DIET_OPTIONS} onChange={(value) => onUpdate("lifestyle", { ...(data.lifestyle || {}), diet: value })} />
          <TextInput label="Interests and hobbies" value={data.lifestyle?.hobbies || ""} onChange={(value) => onUpdate("lifestyle", { ...(data.lifestyle || {}), hobbies: value })} hint="Optional, separated by commas." />
        </div>
        <TextArea label="Partner expectations" value={data.preferences?.narrative || ""} onChange={(value) => onUpdate("preferences", { ...(data.preferences || {}), narrative: value })} required hint="Describe values and compatibility respectfully; avoid a checklist of demands." />
      </FormSection>

      <FormSection number="06" title="Astrology" description="The rashi wordmark appears beside the name. Detailed birth information remains protected.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TextInput label="Time of birth" type="time" value={data.astrology?.time_of_birth || ""} onChange={(value) => onUpdate("astrology", { ...(data.astrology || {}), time_of_birth: value })} required />
          <TextInput label="Place of birth" value={data.personal.place_of_birth || ""} onChange={(value) => updatePersonal({ place_of_birth: value })} required />
          <SelectInput label="Rashi" value={data.astrology?.rashi || ""} options={RASHI_SELECT_OPTIONS} onChange={(value) => onUpdate("astrology", { ...(data.astrology || {}), rashi: value as NonNullable<PortfolioData["astrology"]>["rashi"] })} required />
          <SelectInput label="Nakshatra" value={data.astrology?.nakshatra || ""} options={NAKSHATRA_OPTIONS} onChange={(value) => onUpdate("astrology", { ...(data.astrology || {}), nakshatra: value })} required />
          <TextInput label="Pada" value={data.astrology?.pada || ""} onChange={(value) => onUpdate("astrology", { ...(data.astrology || {}), pada: value })} required />
          <TextInput label="Lagnam" value={data.astrology?.lagnam || ""} onChange={(value) => onUpdate("astrology", { ...(data.astrology || {}), lagnam: value })} required />
          <TextInput label="Gotra" value={data.vitals?.gotra || ""} onChange={(value) => onUpdate("vitals", { ...(data.vitals || {}), gotra: value })} required />
          <TextInput label="Maternal gotra" value={data.astrology?.maternal_gotra || ""} onChange={(value) => onUpdate("astrology", { ...(data.astrology || {}), maternal_gotra: value })} required />
        </div>
      </FormSection>

      <FormSection number="07" title="Protected contact" description="These details are never shown as part of an Open profile. Contact permission is always separate.">
        {contacts.map((contact, index) => (
          <div key={index} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">Contact {index + 1}</p>
              {contacts.length > 1 && (
                <button type="button" onClick={() => updateContacts(contacts.filter((_, itemIndex) => itemIndex !== index))} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs text-white/65 hover:bg-white/5 hover:text-white">
                  <Trash2 className="h-4 w-4" /> Remove
                </button>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectInput label="Relationship" value={contact.relationship || "self"} options={CONTACT_RELATIONSHIPS} onChange={(value) => updateContacts(contacts.map((item, itemIndex) => itemIndex === index ? { ...item, relationship: value } : item))} />
              <TextInput label="Contact name" value={contact.name || ""} onChange={(value) => updateContacts(contacts.map((item, itemIndex) => itemIndex === index ? { ...item, name: value } : item))} required />
              <TextInput label="Phone" type="tel" value={contact.phone || ""} onChange={(value) => updateContacts(contacts.map((item, itemIndex) => itemIndex === index ? { ...item, phone: value } : item))} hint="Provide a phone number, an email, or both." />
              <TextInput label="Email" type="email" value={contact.email || ""} onChange={(value) => updateContacts(contacts.map((item, itemIndex) => itemIndex === index ? { ...item, email: value } : item))} />
            </div>
          </div>
        ))}
        {contacts.length < 5 && <button type="button" onClick={() => updateContacts([...contacts, { relationship: "other", name: "", phone: "", email: "" }])} className="min-h-11 rounded-lg border border-white/15 px-4 text-sm font-semibold text-white hover:border-white/35">Add another contact</button>}
      </FormSection>

      <FormSection number="08" title="Appearance and privacy" description="One Celestial Union layout, with two readable appearances and three privacy levels.">
        <div>
          <p className="mb-3 text-sm font-medium text-white">Appearance</p>
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
          <div className="grid gap-3 lg:grid-cols-3">
            {PRIVACY_PRESETS.map((preset) => {
              const selected = (data.privacy_mode || "progressive") === preset.value;
              const Icon = preset.icon;
              return <button key={preset.value} type="button" aria-pressed={selected} onClick={() => onUpdate("privacy_mode", preset.value)} className={`rounded-xl border p-4 text-left transition ${selected ? "border-[#f4d98f] bg-[#f4d98f]/12" : "border-white/10 bg-white/[0.03] hover:border-white/30"}`}><span className="flex items-center gap-2 text-sm font-semibold text-white"><Icon className="h-4 w-4 text-[#f4d98f]" />{preset.label}{preset.value === "progressive" && <span className="rounded-full bg-[#f4d98f]/15 px-2 py-0.5 text-[9px] uppercase tracking-wide text-[#f4d98f]">Recommended</span>}</span><span className="mt-2 block text-xs leading-5 text-white/55">{preset.description}</span></button>;
            })}
          </div>
        </div>
      </FormSection>
    </div>
  );
}

function FormSection({ number, title, description, children }: { number: string; title: string; description: string; children: React.ReactNode }) {
  return <section className="space-y-5 border-b border-white/10 pb-8 last:border-b-0"><div className="flex gap-3"><span className="mt-0.5 text-xs font-semibold tracking-[0.18em] text-[#f4d98f]">{number}</span><div><h3 className="text-base font-semibold text-white">{title}</h3><p className="mt-1 max-w-2xl text-xs leading-5 text-white/50">{description}</p></div></div>{children}</section>;
}

function FieldLabel({ label, hint, required }: { label: string; hint?: string; required?: boolean }) {
  return <span><span className="flex items-center gap-1.5">{label}{required && <span className="text-[#f4d98f]">*</span>}</span>{hint && <span className="mt-0.5 block text-xs font-normal leading-5 text-white/45">{hint}</span>}</span>;
}

function TextInput({ label, value, onChange, type = "text", placeholder, hint, required, min, max }: { label: string; value: string; onChange: (value: string) => void; type?: React.HTMLInputTypeAttribute; placeholder?: string; hint?: string; required?: boolean; min?: string; max?: string }) {
  return <label className="flex flex-col gap-1.5 text-sm font-medium text-white/85"><FieldLabel label={label} hint={hint} required={required} /><input aria-label={label} type={type} value={value} placeholder={placeholder} required={required} min={min} max={max} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-normal text-white outline-none placeholder:text-white/30 focus:border-[#f4d98f]/60 focus:ring-2 focus:ring-[#f4d98f]/20" /></label>;
}

function TextArea({ label, value, onChange, hint, required }: { label: string; value: string; onChange: (value: string) => void; hint?: string; required?: boolean }) {
  return <label className="flex flex-col gap-1.5 text-sm font-medium text-white/85"><FieldLabel label={label} hint={hint} required={required} /><textarea aria-label={label} value={value} required={required} onChange={(event) => onChange(event.target.value)} rows={4} className="resize-y rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-normal leading-6 text-white outline-none placeholder:text-white/30 focus:border-[#f4d98f]/60 focus:ring-2 focus:ring-[#f4d98f]/20" /></label>;
}

function SelectInput({ label, value, options, onChange, required }: { label: string; value: string; options: BlueprintOption[]; onChange: (value: string) => void; required?: boolean }) {
  return <label className="flex flex-col gap-1.5 text-sm font-medium text-white/85"><FieldLabel label={label} required={required} /><select aria-label={label} value={value} required={required} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-lg border border-white/10 bg-[#20212e] px-3 text-sm font-normal text-white outline-none focus:border-[#f4d98f]/60 focus:ring-2 focus:ring-[#f4d98f]/20">{options.map((item) => <option key={`${item.value}-${item.label}`} value={item.value}>{item.label}</option>)}</select></label>;
}
