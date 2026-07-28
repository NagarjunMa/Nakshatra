"use client";

import { LockKeyhole, ShieldCheck } from "lucide-react";
import { RashiPalettePicker } from "@/components/portfolio/RashiPalettePicker";
import {
  getDefaultRashiPalette,
  getRashiPalette,
  getRashiPalettes,
  type RashiPalette,
} from "@/features/portfolio/rashi-theme";
import {
  CHILDREN_OPTIONS,
  COUNTRY_OPTIONS,
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
  MARITAL_STATUS_OPTIONS,
  MARRIAGE_TIMELINE_OPTIONS,
  NAKSHATRA_OPTIONS,
  PARENT_SUPPORT_OPTIONS,
  PROFILE_FOR_OPTIONS,
  QUALIFICATION_OPTIONS,
  RELOCATION_OPTIONS,
  RELIGION_OPTIONS,
  SECTION_AUDIENCE_OPTIONS,
  SIBLING_POSITION_OPTIONS,
  VISA_OPTIONS,
  WEALTH_STAGE_OPTIONS,
  WEDDING_EXPECTATION_OPTIONS,
  type BlueprintOption,
} from "@/features/portfolio/blueprint-options";
import {
  RASHI_OPTIONS,
  type AccessData,
  type PortfolioData,
  type RashiKey,
} from "@/types/portfolio";

type UpdatePortfolioSection = (
  key: keyof PortfolioData,
  sectionData: Record<string, unknown>
) => void;

export function BlueprintForm({
  data,
  onUpdate,
}: {
  data: PortfolioData;
  onUpdate: UpdatePortfolioSection;
}) {
  const rashi = data.astrology?.rashi || "";
  const palettes = getRashiPalettes(rashi);
  const selectedPalette = getRashiPalette(data.style?.rashi_palette, rashi);

  function updatePersonal(changes: Record<string, unknown>) {
    const next = { ...data.personal, ...changes };
    if ("country" in changes || "region" in changes || "city" in changes) {
      next.current_location = [next.city, next.region, next.country]
        .filter(Boolean)
        .join(", ");
    }
    onUpdate("personal", next);
  }

  function updateAccess(section: keyof AccessData, value: string) {
    onUpdate("access", { ...(data.access || {}), [section]: value });
  }

  function selectRashi(value: string) {
    const nextRashi = value as RashiKey | "";
    const nextDefault = getDefaultRashiPalette(nextRashi);
    const existingPalette = getRashiPalette(data.style?.rashi_palette, nextRashi);

    onUpdate("astrology", { ...(data.astrology || {}), rashi: value });
    if (nextDefault && !existingPalette) {
      onUpdate("style", {
        ...(data.style || {}),
        rashi_palette: nextDefault.id,
        theme_color: nextDefault.background,
      });
    }
  }

  function selectPalette(palette: RashiPalette) {
    onUpdate("style", {
      ...(data.style || {}),
      rashi_palette: palette.id,
      theme_color: palette.background,
    });
  }

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-[#f4d98f]/20 bg-[#f4d98f]/7 p-4">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#f4d98f]" />
          <div>
            <p className="text-sm font-semibold text-white">Your private blueprint</p>
            <p className="mt-1 text-xs leading-5 text-white/60">
              Public information shapes your portfolio. Approved and broker information stays
              private until you explicitly grant access.
            </p>
          </div>
        </div>
      </div>

      <FormSection
        number="01"
        title="Your story"
        description="Give people a genuine sense of your journey, outlook, and the life you hope to build."
        audience={data.access?.journey || "public"}
        onAudienceChange={(value) => updateAccess("journey", value)}
      >
        <SelectInput
          label="Who is creating this profile?"
          value={data.personal.profile_for || ""}
          options={PROFILE_FOR_OPTIONS}
          onChange={(value) => updatePersonal({ profile_for: value })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Full name"
            value={data.personal.name}
            onChange={(value) => updatePersonal({ name: value })}
            required
          />
          <TextInput
            label="Preferred or display name"
            value={data.personal.preferred_name || ""}
            onChange={(value) => updatePersonal({ preferred_name: value })}
          />
        </div>
        <TextArea
          label="What would you like someone to understand about you?"
          value={data.personal.profile_summary || ""}
          placeholder="Share a few thoughtful lines about your personality and journey..."
          hint="Recommended for your public portfolio."
          onChange={(value) => updatePersonal({ profile_summary: value })}
        />
        <TextArea
          label="What kind of life are you building?"
          value={data.personal.long_term_goals || ""}
          placeholder="Your long-term aspirations, priorities, and vision..."
          onChange={(value) => updatePersonal({ long_term_goals: value })}
        />
        <TextArea
          label="What would you enjoy doing together?"
          value={data.personal.shared_life_plans || ""}
          placeholder="Travel, quiet weekends, family traditions, creative plans..."
          onChange={(value) => updatePersonal({ shared_life_plans: value })}
        />
      </FormSection>

      <FormSection
        number="02"
        title="Personal details"
        description="Structured details help portfolios stay consistent and make broker matching more reliable."
        audience={data.access?.personal || "approved"}
        onAudienceChange={(value) => updateAccess("personal", value)}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Date of birth"
            type="date"
            value={data.personal.dob}
            onChange={(value) => updatePersonal({ dob: value })}
            required
          />
          <SelectInput
            label="Gender"
            value={data.personal.gender}
            options={GENDER_OPTIONS}
            onChange={(value) => updatePersonal({ gender: value })}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectInput
            label="Height"
            value={data.vitals?.height || ""}
            options={HEIGHT_OPTIONS}
            onChange={(value) =>
              onUpdate("vitals", { ...(data.vitals || {}), height: value })
            }
          />
          <SelectInput
            label="Marital status"
            value={data.personal.marital_status || ""}
            options={MARITAL_STATUS_OPTIONS}
            onChange={(value) => updatePersonal({ marital_status: value })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectInput
            label="Country of residence"
            value={data.personal.country || ""}
            options={COUNTRY_OPTIONS}
            onChange={(value) => updatePersonal({ country: value })}
          />
          <TextInput
            label="State or region"
            value={data.personal.region || ""}
            onChange={(value) => updatePersonal({ region: value })}
          />
          <TextInput
            label="City"
            value={data.personal.city || ""}
            onChange={(value) => updatePersonal({ city: value })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectInput
            label="Citizenship"
            value={data.personal.citizenship || ""}
            options={COUNTRY_OPTIONS}
            onChange={(value) => updatePersonal({ citizenship: value })}
          />
          <SelectInput
            label="Visa or residency status"
            value={data.personal.immigration_status || ""}
            options={VISA_OPTIONS}
            hint="Used for matching; hidden from the public portfolio."
            onChange={(value) => updatePersonal({ immigration_status: value })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectInput
            label="Religion or outlook"
            value={data.personal.religion || ""}
            options={RELIGION_OPTIONS}
            onChange={(value) => updatePersonal({ religion: value })}
          />
          <TextInput
            label="Community"
            value={data.personal.community || ""}
            onChange={(value) => updatePersonal({ community: value })}
          />
          <TextInput
            label="Sub-community"
            value={data.personal.sub_community || ""}
            onChange={(value) => updatePersonal({ sub_community: value })}
          />
        </div>
      </FormSection>

      <FormSection
        number="03"
        title="Education and work"
        description="Capture the structured facts for matching, then add context in your own words."
        audience={data.access?.career || "public"}
        onAudienceChange={(value) => updateAccess("career", value)}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectInput
            label="Highest qualification"
            value={data.education?.qualification_level || ""}
            options={QUALIFICATION_OPTIONS}
            onChange={(value) =>
              onUpdate("education", {
                ...(data.education || {}),
                qualification_level: value,
              })
            }
          />
          <TextInput
            label="Degree or specialization"
            value={data.education?.degree || ""}
            onChange={(value) =>
              onUpdate("education", { ...(data.education || {}), degree: value })
            }
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Institution"
            value={data.education?.institution || ""}
            onChange={(value) =>
              onUpdate("education", {
                ...(data.education || {}),
                institution: value,
              })
            }
          />
          <TextInput
            label="Education location"
            value={data.education?.location || ""}
            onChange={(value) =>
              onUpdate("education", { ...(data.education || {}), location: value })
            }
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Current role"
            value={data.career?.title || ""}
            onChange={(value) =>
              onUpdate("career", { ...(data.career || {}), title: value })
            }
          />
          <TextInput
            label="Company"
            value={data.career?.company || ""}
            onChange={(value) =>
              onUpdate("career", { ...(data.career || {}), company: value })
            }
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectInput
            label="Work status"
            value={data.career?.job_type || ""}
            options={JOB_TYPE_OPTIONS}
            onChange={(value) =>
              onUpdate("career", { ...(data.career || {}), job_type: value })
            }
          />
          <TextInput
            label="Work location"
            value={data.career?.location || ""}
            onChange={(value) =>
              onUpdate("career", { ...(data.career || {}), location: value })
            }
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_.55fr_1fr]">
          <TextInput
            label="Annual income"
            value={data.career?.annual_income || ""}
            hint="Optional and hidden publicly by default."
            onChange={(value) =>
              onUpdate("career", { ...(data.career || {}), annual_income: value })
            }
          />
          <SelectInput
            label="Currency"
            value={data.career?.income_currency || ""}
            options={CURRENCY_OPTIONS}
            onChange={(value) =>
              onUpdate("career", { ...(data.career || {}), income_currency: value })
            }
          />
          <SelectInput
            label="Financial stage"
            value={data.career?.wealth_stage || ""}
            options={WEALTH_STAGE_OPTIONS}
            onChange={(value) =>
              onUpdate("career", { ...(data.career || {}), wealth_stage: value })
            }
          />
        </div>
        <TextArea
          label="Where would you like your career to go?"
          value={data.career?.career_goals || ""}
          placeholder="Share the direction you are working toward..."
          onChange={(value) =>
            onUpdate("career", { ...(data.career || {}), career_goals: value })
          }
        />
      </FormSection>

      <FormSection
        number="04"
        title="Family and background"
        description="Family details are request-only by default. Your public portfolio can show a short introduction instead."
        audience={data.access?.family || "approved"}
        onAudienceChange={(value) => updateAccess("family", value)}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Father's name"
            value={data.family?.father?.name || ""}
            onChange={(value) =>
              onUpdate("family", {
                ...(data.family || {}),
                father: { ...(data.family?.father || {}), name: value },
              })
            }
          />
          <TextInput
            label="Father's profession"
            value={data.family?.father?.occupation || ""}
            onChange={(value) =>
              onUpdate("family", {
                ...(data.family || {}),
                father: { ...(data.family?.father || {}), occupation: value },
              })
            }
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Mother's name"
            value={data.family?.mother?.name || ""}
            onChange={(value) =>
              onUpdate("family", {
                ...(data.family || {}),
                mother: { ...(data.family?.mother || {}), name: value },
              })
            }
          />
          <TextInput
            label="Mother's profession"
            value={data.family?.mother?.occupation || ""}
            onChange={(value) =>
              onUpdate("family", {
                ...(data.family || {}),
                mother: { ...(data.family?.mother || {}), occupation: value },
              })
            }
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextInput
            label="Number of siblings"
            type="number"
            value={String(data.family?.sibling_count ?? "")}
            onChange={(value) =>
              onUpdate("family", {
                ...(data.family || {}),
                sibling_count: value === "" ? undefined : Number(value),
              })
            }
          />
          <SelectInput
            label="Your position"
            value={data.family?.sibling_position || ""}
            options={SIBLING_POSITION_OPTIONS}
            onChange={(value) =>
              onUpdate("family", {
                ...(data.family || {}),
                sibling_position: value,
              })
            }
          />
          <TextInput
            label="Parents' current location"
            value={data.family?.parents_location || ""}
            onChange={(value) =>
              onUpdate("family", {
                ...(data.family || {}),
                parents_location: value,
              })
            }
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Ancestral origin"
            value={data.family?.ancestral_origin || ""}
            onChange={(value) =>
              onUpdate("family", {
                ...(data.family || {}),
                ancestral_origin: value,
              })
            }
          />
          <TextInput
            label="Current family settlement"
            value={data.family?.current_settlement || ""}
            onChange={(value) =>
              onUpdate("family", {
                ...(data.family || {}),
                current_settlement: value,
              })
            }
          />
        </div>
        <TextArea
          label="How would you introduce your family?"
          value={data.family?.family_note || ""}
          placeholder="Share the values, traditions, and atmosphere that matter to your family..."
          onChange={(value) =>
            onUpdate("family", { ...(data.family || {}), family_note: value })
          }
        />
      </FormSection>

      <FormSection
        number="05"
        title="Lifestyle and interests"
        description="Select structured habits for compatibility and use interests to make the portfolio feel personal."
        audience={data.access?.lifestyle || "public"}
        onAudienceChange={(value) => updateAccess("lifestyle", value)}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectInput
            label="Dietary preference"
            value={data.lifestyle?.diet || ""}
            options={DIET_OPTIONS}
            onChange={(value) =>
              onUpdate("lifestyle", { ...(data.lifestyle || {}), diet: value })
            }
          />
          <SelectInput
            label="Drinking"
            value={data.lifestyle?.drinking || ""}
            options={FREQUENCY_OPTIONS}
            onChange={(value) =>
              onUpdate("lifestyle", { ...(data.lifestyle || {}), drinking: value })
            }
          />
          <SelectInput
            label="Smoking"
            value={data.lifestyle?.smoking || ""}
            options={FREQUENCY_OPTIONS}
            onChange={(value) =>
              onUpdate("lifestyle", { ...(data.lifestyle || {}), smoking: value })
            }
          />
        </div>
        <MultiSelectInput
          label="Languages"
          value={data.lifestyle?.languages || ""}
          options={LANGUAGE_OPTIONS}
          onChange={(value) =>
            onUpdate("lifestyle", { ...(data.lifestyle || {}), languages: value })
          }
        />
        <MultiSelectInput
          label="Interests and hobbies"
          value={data.lifestyle?.hobbies || ""}
          options={HOBBY_OPTIONS}
          onChange={(value) =>
            onUpdate("lifestyle", { ...(data.lifestyle || {}), hobbies: value })
          }
        />
        <TextArea
          label="Which values guide your relationships?"
          value={data.lifestyle?.values_statement || ""}
          placeholder="Trust, family, independence, faith, curiosity, service..."
          onChange={(value) =>
            onUpdate("lifestyle", {
              ...(data.lifestyle || {}),
              values_statement: value,
            })
          }
        />
      </FormSection>

      <FormSection
        number="06"
        title="Partner preferences"
        description="These answers support compatibility and broker decisions; they are not public by default."
        audience={data.access?.preferences || "broker"}
        onAudienceChange={(value) => updateAccess("preferences", value)}
      >
        <TextArea
          label="What kind of partnership are you hoping to build?"
          value={data.preferences?.narrative || ""}
          placeholder="Describe the qualities and shared direction that matter most..."
          onChange={(value) =>
            onUpdate("preferences", {
              ...(data.preferences || {}),
              narrative: value,
            })
          }
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Preferred age range"
            value={data.preferences?.age_range || ""}
            placeholder="For example, 28–34"
            onChange={(value) =>
              onUpdate("preferences", {
                ...(data.preferences || {}),
                age_range: value,
              })
            }
          />
          <TextInput
            label="Preferred height range"
            value={data.preferences?.height_range || ""}
            placeholder={`For example, 5'4"–5'10"`}
            onChange={(value) =>
              onUpdate("preferences", {
                ...(data.preferences || {}),
                height_range: value,
              })
            }
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectInput
            label="Preferred marital status"
            value={data.preferences?.marital_status || ""}
            options={MARITAL_STATUS_OPTIONS}
            onChange={(value) =>
              onUpdate("preferences", {
                ...(data.preferences || {}),
                marital_status: value,
              })
            }
          />
          <SelectInput
            label="Horoscope preference"
            value={data.preferences?.horoscope_preference || ""}
            options={HOROSCOPE_PREFERENCE_OPTIONS}
            onChange={(value) =>
              onUpdate("preferences", {
                ...(data.preferences || {}),
                horoscope_preference: value,
              })
            }
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Preferred communities"
            value={data.preferences?.specific_communities || ""}
            placeholder="Comma-separated; leave blank if open"
            onChange={(value) =>
              onUpdate("preferences", {
                ...(data.preferences || {}),
                specific_communities: value,
              })
            }
          />
          <MultiSelectInput
            label="Preferred countries"
            value={
              data.preferences?.location_preferences ||
              data.preferences?.location_preference ||
              ""
            }
            options={COUNTRY_OPTIONS.filter((item) => item.value)}
            onChange={(value) =>
              onUpdate("preferences", {
                ...(data.preferences || {}),
                location_preferences: value,
                location_preference: value,
              })
            }
          />
        </div>
        <MultiSelectInput
          label="Preferred visa or residency statuses"
          value={data.preferences?.visa_preferences || ""}
          options={VISA_OPTIONS.filter((item) => item.value)}
          onChange={(value) =>
            onUpdate("preferences", {
              ...(data.preferences || {}),
              visa_preferences: value,
            })
          }
        />
      </FormSection>

      <FormSection
        number="07"
        title="Future plans"
        description="Direct questions make practical alignment easier while keeping room for discussion."
        audience={data.access?.future_plans || "approved"}
        onAudienceChange={(value) => updateAccess("future_plans", value)}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectInput
            label="When would you ideally like to marry?"
            value={data.preferences?.marriage_timeline || ""}
            options={MARRIAGE_TIMELINE_OPTIONS}
            onChange={(value) =>
              onUpdate("preferences", {
                ...(data.preferences || {}),
                marriage_timeline: value,
              })
            }
          />
          <SelectInput
            label="How do you feel about having children?"
            value={data.preferences?.children_preference || ""}
            options={CHILDREN_OPTIONS}
            onChange={(value) =>
              onUpdate("preferences", {
                ...(data.preferences || {}),
                children_preference: value,
              })
            }
          />
        </div>
        <SelectInput
          label="Would you consider relocating after marriage?"
          value={data.personal.relocation_preference || ""}
          options={RELOCATION_OPTIONS}
          onChange={(value) => updatePersonal({ relocation_preference: value })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectInput
            label="What kind of wedding feels right to you?"
            value={data.preferences?.wedding_expectations || ""}
            options={WEDDING_EXPECTATION_OPTIONS}
            onChange={(value) =>
              onUpdate("preferences", {
                ...(data.preferences || {}),
                wedding_expectations: value,
              })
            }
          />
          <SelectInput
            label="Wedding expenses and gift expectations"
            value={data.preferences?.gift_expectations || ""}
            options={GIFT_EXPECTATION_OPTIONS}
            onChange={(value) =>
              onUpdate("preferences", {
                ...(data.preferences || {}),
                gift_expectations: value,
              })
            }
          />
        </div>
        <SelectInput
          label="How do you imagine supporting parents after marriage?"
          value={data.preferences?.parent_support || ""}
          options={PARENT_SUPPORT_OPTIONS}
          onChange={(value) =>
            onUpdate("preferences", {
              ...(data.preferences || {}),
              parent_support: value,
            })
          }
        />
      </FormSection>

      <FormSection
        number="08"
        title="Astrology"
        description="Core astrological details can support matching while exact birth information remains restricted."
        audience={data.access?.astrology || "approved"}
        onAudienceChange={(value) => updateAccess("astrology", value)}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Time of birth"
            type="time"
            value={data.astrology?.time_of_birth || ""}
            onChange={(value) =>
              onUpdate("astrology", {
                ...(data.astrology || {}),
                time_of_birth: value,
              })
            }
          />
          <TextInput
            label="Place of birth"
            value={data.personal.place_of_birth || ""}
            onChange={(value) => updatePersonal({ place_of_birth: value })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectInput
            label="Rashi"
            value={data.astrology?.rashi || ""}
            options={[
              { value: "", label: "Select rashi" },
              ...RASHI_OPTIONS.map((item) => ({
                value: item.key,
                label: item.label,
              })),
            ]}
            onChange={selectRashi}
          />
          <SelectInput
            label="Nakshatra"
            value={data.astrology?.nakshatra || ""}
            options={[{ value: "", label: "Select nakshatra" }, ...NAKSHATRA_OPTIONS]}
            onChange={(value) =>
              onUpdate("astrology", {
                ...(data.astrology || {}),
                nakshatra: value,
              })
            }
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextInput
            label="Gotra"
            value={data.vitals?.gotra || ""}
            onChange={(value) =>
              onUpdate("vitals", { ...(data.vitals || {}), gotra: value })
            }
          />
          <TextInput
            label="Maternal gotra"
            value={data.astrology?.maternal_gotra || ""}
            onChange={(value) =>
              onUpdate("astrology", {
                ...(data.astrology || {}),
                maternal_gotra: value,
              })
            }
          />
          <SelectInput
            label="Manglik status"
            value={data.astrology?.manglik_status || ""}
            options={MANGLIK_OPTIONS}
            onChange={(value) =>
              onUpdate("astrology", {
                ...(data.astrology || {}),
                manglik_status: value,
              })
            }
          />
        </div>
      </FormSection>

      <FormSection
        number="09"
        title="Portfolio and privacy"
        description="Choose the public presentation and confirm which existing detail groups require approval."
        audience="owner"
        onAudienceChange={() => {}}
        lockAudience
      >
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm font-medium text-white">Rashi-inspired palette</p>
          <p className="mb-3 mt-1 text-xs leading-5 text-white/55">
            Colors affect presentation only; they do not change access.
          </p>
          <RashiPalettePicker
            palettes={palettes}
            selectedPaletteId={selectedPalette?.id}
            onSelect={selectPalette}
          />
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm font-medium text-white">Portfolio template</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {["Royal Heritage", "Celestial Union"].map((templateName) => {
              const selected =
                (data.style?.template_name || "Royal Heritage") === templateName;
              return (
                <button
                  key={templateName}
                  type="button"
                  onClick={() =>
                    onUpdate("style", {
                      ...(data.style || {}),
                      template_name: templateName,
                    })
                  }
                  className={`rounded-lg border px-3 py-3 text-left text-xs font-semibold transition ${
                    selected
                      ? "border-[#f4d98f] bg-[#f4d98f]/15 text-[#f4d98f]"
                      : "border-white/15 text-white/70 hover:border-white/35"
                  }`}
                  aria-pressed={selected}
                >
                  {templateName}
                </button>
              );
            })}
          </div>
        </div>
        <RestrictionToggle
          label="Require approval for family details"
          checked={(data.visibility?.family || "restricted") === "restricted"}
          onChange={(checked) =>
            onUpdate("visibility", {
              ...(data.visibility || {}),
              family: checked ? "restricted" : "public",
            })
          }
        />
        <RestrictionToggle
          label="Require approval for detailed astrology"
          checked={
            (data.visibility?.astrology_details || "restricted") === "restricted"
          }
          onChange={(checked) =>
            onUpdate("visibility", {
              ...(data.visibility || {}),
              astrology_details: checked ? "restricted" : "public",
            })
          }
        />
        <RestrictionToggle
          label="Require approval for private gallery photos"
          checked={(data.visibility?.gallery || "restricted") === "restricted"}
          onChange={(checked) =>
            onUpdate("visibility", {
              ...(data.visibility || {}),
              gallery: checked ? "restricted" : "public",
            })
          }
        />
      </FormSection>
    </div>
  );
}

function FormSection({
  number,
  title,
  description,
  audience,
  onAudienceChange,
  lockAudience = false,
  children,
}: {
  number: string;
  title: string;
  description: string;
  audience: string;
  onAudienceChange: (value: string) => void;
  lockAudience?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5 border-b border-white/10 pb-8 last:border-b-0">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="flex gap-3">
          <span className="mt-0.5 text-xs font-semibold tracking-[0.18em] text-[#f4d98f]">
            {number}
          </span>
          <div>
            <h3 className="text-base font-semibold text-white">{title}</h3>
            <p className="mt-1 max-w-xl text-xs leading-5 text-white/50">
              {description}
            </p>
          </div>
        </div>
        <label className="flex min-w-44 flex-col gap-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-white/45">
          Who can see this
          <select
            value={audience}
            onChange={(event) => onAudienceChange(event.target.value)}
            disabled={lockAudience}
            className="h-9 rounded-lg border border-white/10 bg-[#20212e] px-2 text-xs font-medium normal-case tracking-normal text-white outline-none disabled:opacity-60"
          >
            {SECTION_AUDIENCE_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {children}
    </section>
  );
}

function FieldLabel({
  label,
  hint,
  required,
}: {
  label: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <span>
      <span className="flex items-center gap-1.5">
        {label}
        {required && <span className="text-[#f4d98f]">*</span>}
      </span>
      {hint && <span className="mt-0.5 block text-xs font-normal text-white/40">{hint}</span>}
    </span>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  hint,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: React.HTMLInputTypeAttribute;
  placeholder?: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-white/85">
      <FieldLabel label={label} hint={hint} required={required} />
      <input
        aria-label={label}
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-normal text-white outline-none placeholder:text-white/30 focus:border-[#f4d98f]/60 focus:ring-2 focus:ring-[#f4d98f]/20"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-white/85">
      <FieldLabel label={label} hint={hint} />
      <textarea
        aria-label={label}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="resize-y rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-normal leading-6 text-white outline-none placeholder:text-white/30 focus:border-[#f4d98f]/60 focus:ring-2 focus:ring-[#f4d98f]/20"
      />
    </label>
  );
}

function SelectInput({
  label,
  value,
  options,
  onChange,
  hint,
  required,
}: {
  label: string;
  value: string;
  options: BlueprintOption[];
  onChange: (value: string) => void;
  hint?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-white/85">
      <FieldLabel label={label} hint={hint} required={required} />
      <select
        aria-label={label}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-lg border border-white/10 bg-[#20212e] px-3 text-sm font-normal text-white outline-none focus:border-[#f4d98f]/60 focus:ring-2 focus:ring-[#f4d98f]/20"
      >
        {options.map((item) => (
          <option key={`${item.value}-${item.label}`} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function MultiSelectInput({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: BlueprintOption[];
  onChange: (value: string) => void;
}) {
  const selected = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  function toggle(item: string) {
    const next = selected.includes(item)
      ? selected.filter((selectedItem) => selectedItem !== item)
      : [...selected, item];
    onChange(next.join(", "));
  }

  return (
    <fieldset className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <legend className="px-1 text-sm font-medium text-white/85">{label}</legend>
      {selected.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {selected.map((item) => (
            <span
              key={item}
              className="rounded-full border border-[#f4d98f]/20 bg-[#f4d98f]/10 px-2.5 py-1 text-xs text-[#f4d98f]"
            >
              {item}
            </span>
          ))}
        </div>
      )}
      <details>
        <summary className="cursor-pointer text-xs font-medium text-white/60">
          {selected.length ? "Edit selections" : "Choose one or more"}
        </summary>
        <div className="mt-3 grid max-h-48 gap-1 overflow-y-auto sm:grid-cols-2">
          {options.map((item) => (
            <label
              key={item.value}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-white/70 hover:bg-white/5"
            >
              <input
                type="checkbox"
                checked={selected.includes(item.value)}
                onChange={() => toggle(item.value)}
                className="h-3.5 w-3.5 accent-[#f4d98f]"
              />
              {item.label}
            </label>
          ))}
        </div>
      </details>
    </fieldset>
  );
}

function RestrictionToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3 text-sm font-medium text-white/85">
      <span className="flex items-center gap-2">
        <LockKeyhole className="h-4 w-4 text-white/50" />
        {label}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[#f4d98f]"
      />
    </label>
  );
}
