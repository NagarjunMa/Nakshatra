import { z } from "zod/v4";

// --- Rashi keys for validation ---

export const RASHI_OPTIONS = [
  { key: "mesha", label: "Mesha (Aries)", element: "fire" },
  { key: "vrishabha", label: "Vrishabha (Taurus)", element: "earth" },
  { key: "mithuna", label: "Mithuna (Gemini)", element: "air" },
  { key: "karka", label: "Karka (Cancer)", element: "water" },
  { key: "simha", label: "Simha (Leo)", element: "fire" },
  { key: "kanya", label: "Kanya (Virgo)", element: "earth" },
  { key: "tula", label: "Tula (Libra)", element: "air" },
  { key: "vrishchika", label: "Vrishchika (Scorpio)", element: "water" },
  { key: "dhanu", label: "Dhanu (Sagittarius)", element: "fire" },
  { key: "makara", label: "Makara (Capricorn)", element: "earth" },
  { key: "kumbha", label: "Kumbha (Aquarius)", element: "air" },
  { key: "meena", label: "Meena (Pisces)", element: "water" },
] as const;

export type RashiKey = (typeof RASHI_OPTIONS)[number]["key"];

const RASHI_KEYS = RASHI_OPTIONS.map((r) => r.key) as [string, ...string[]];

// --- Form Step Schemas ---

export const personalSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  preferred_name: z.string().max(100).optional(),
  photo_url: z.string().url().optional(),
  photo_thumb_url: z.string().url().optional(),
  dob: z
    .union([
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
      z.literal(""),
    ])
    .optional(),
  age: z.number().int().min(18).max(120).optional(),
  place_of_birth: z.string().max(200).optional(),
  current_location: z.string().max(200).optional(),
  gender: z.enum(["male", "female", "non_binary", "prefer_not_to_say"]),
  marital_status: z.string().max(100).optional(),
  immigration_status: z.string().max(200).optional(),
  relocation_preference: z.string().max(200).optional(),
  profile_summary: z.string().max(1600).optional(),
  profile_for: z.string().max(50).optional(),
  country: z.string().max(100).optional(),
  country_code: z.string().max(2).optional(),
  region: z.string().max(100).optional(),
  region_code: z.string().max(30).optional(),
  city: z.string().max(120).optional(),
  city_geoname_id: z.number().int().positive().optional(),
  citizenship: z.string().max(100).optional(),
  religion: z.string().max(100).optional(),
  community: z.string().max(150).optional(),
  sub_community: z.string().max(150).optional(),
  long_term_goals: z.string().max(1200).optional(),
  shared_life_plans: z.string().max(1200).optional(),
});

export const vitalsSchema = z.object({
  height: z.string().max(50).optional(),
  complexion: z.string().max(100).optional(),
  gotra: z.string().max(100).optional(),
});

export const astrologySchema = z.object({
  rashi: z.enum(["", ...RASHI_KEYS]).optional(),
  nakshatra: z.string().max(100).optional(),
  pada: z.string().max(50).optional(),
  time_of_birth: z
    .union([
      z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format"),
      z.literal(""),
    ])
    .optional(),
  lagnam: z.string().max(100).optional(),
  manglik_status: z.string().max(100).optional(),
  maternal_gotra: z.string().max(100).optional(),
});

export const educationSchema = z.object({
  degree: z.string().max(200).optional(),
  institution: z.string().max(200).optional(),
  year: z.string().max(10).optional(),
  location: z.string().max(200).optional(),
  summary: z.string().max(600).optional(),
  qualification_level: z.string().max(100).optional(),
});

export const careerSchema = z.object({
  title: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
  summary: z.string().max(600).optional(),
  job_type: z.string().max(100).optional(),
  annual_income: z.string().max(100).optional(),
  income_currency: z.string().max(20).optional(),
  wealth_stage: z.string().max(100).optional(),
  career_goals: z.string().max(800).optional(),
});

const familyMemberSchema = z.object({
  name: z.string().max(100).optional(),
  occupation: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
  marital_status: z.string().max(100).optional(),
});

export const familySchema = z.object({
  father: familyMemberSchema.optional(),
  mother: familyMemberSchema.optional(),
  siblings: z.array(familyMemberSchema).max(10, "Maximum 10 siblings").optional(),
  ancestral_origin: z.string().max(200).optional(),
  paternal_origin: z.string().max(200).optional(),
  maternal_origin: z.string().max(200).optional(),
  public_summary: z.string().max(600).optional(),
  current_settlement: z.string().max(200).optional(),
  family_note: z.string().max(800).optional(),
  sibling_count: z.number().int().min(0).max(20).optional(),
  sibling_position: z.string().max(100).optional(),
  parents_location: z.string().max(200).optional(),
  current_country: z.string().max(100).optional(),
  current_country_code: z.string().max(2).optional(),
  current_region: z.string().max(100).optional(),
  current_region_code: z.string().max(30).optional(),
  current_city: z.string().max(120).optional(),
  current_city_geoname_id: z.number().int().positive().optional(),
  family_spread: z.string().max(600).optional(),
});

export const lifestyleSchema = z.object({
  hobbies: z.string().max(500).optional(),
  languages: z.string().max(300).optional(),
  diet: z.string().max(100).optional(),
  smoking: z.string().max(100).optional(),
  drinking: z.string().max(100).optional(),
  music: z.string().max(300).optional(),
  values_statement: z.string().max(1200).optional(),
  credit_score_band: z.string().max(100).optional(),
});

const contactEntrySchema = z.object({
  relationship: z.string().max(50).optional(),
  name: z.string().max(100).optional(),
  phone: z
    .union([
      z.string().regex(/^[+\d\s()-]*$/, "Invalid phone number"),
      z.literal(""),
    ])
    .optional(),
  email: z.union([z.email("Invalid email"), z.literal("")]).optional(),
});

export const contactSchema = z.object({
  contact_person: z.string().max(100).optional(),
  phone: z
    .union([
      z.string().regex(/^[+\d\s()-]*$/, "Invalid phone number"),
      z.literal(""),
    ])
    .optional(),
  email: z.union([z.email("Invalid email"), z.literal("")]).optional(),
  secure_note: z.string().max(600).optional(),
  contacts: z.array(contactEntrySchema).max(5, "Maximum 5 contacts").optional(),
});

export const styleSchema = z.object({
  appearance: z.enum(["light", "dark"]).optional(),
  theme_color: z
    .union([
      z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid color"),
      z.literal(""),
    ])
    .optional(),
  rashi_palette: z.string().max(100).optional(),
  template_name: z.string().max(100).optional(),
});

export const preferencesSchema = z.object({
  narrative: z.string().max(1200).optional(),
  age_range: z.string().max(100).optional(),
  height_range: z.string().max(100).optional(),
  marital_status: z.string().max(100).optional(),
  background: z.string().max(200).optional(),
  location_preference: z.string().max(200).optional(),
  location_preferences: z.string().max(500).optional(),
  visa_preferences: z.string().max(500).optional(),
  caste_preference: z.string().max(100).optional(),
  specific_communities: z.string().max(500).optional(),
  horoscope_preference: z.string().max(100).optional(),
  marriage_timeline: z.string().max(100).optional(),
  children_preference: z.string().max(100).optional(),
  wedding_expectations: z.string().max(300).optional(),
  gift_expectations: z.string().max(200).optional(),
  parent_support: z.string().max(200).optional(),
  religion_preference: z.string().max(200).optional(),
  lifestyle_expectations: z.string().max(800).optional(),
  education_expectations: z.string().max(500).optional(),
  career_expectations: z.string().max(500).optional(),
  private_notes: z.string().max(1000).optional(),
});

export const accessAudienceSchema = z.enum(["public", "approved", "broker", "owner"]);

export const accessSchema = z.object({
  journey: accessAudienceSchema.optional(),
  personal: accessAudienceSchema.optional(),
  career: accessAudienceSchema.optional(),
  family: accessAudienceSchema.optional(),
  lifestyle: accessAudienceSchema.optional(),
  preferences: accessAudienceSchema.optional(),
  future_plans: accessAudienceSchema.optional(),
  astrology: accessAudienceSchema.optional(),
  contact: accessAudienceSchema.optional(),
});

export const visibilitySchema = z.object({
  personal_story: z.enum(["public", "restricted"]).optional(),
  journey: z.enum(["public", "restricted"]).optional(),
  lifestyle: z.enum(["public", "restricted"]).optional(),
  family: z.enum(["public", "restricted"]).optional(),
  family_details: z.enum(["public", "restricted"]).optional(),
  astrology: z.enum(["public", "restricted"]).optional(),
  astrology_details: z.enum(["public", "restricted"]).optional(),
  gallery: z.enum(["public", "restricted"]).optional(),
  preferences: z.enum(["public", "restricted"]).optional(),
  future_plans: z.enum(["public", "restricted"]).optional(),
  contact: z.enum(["public", "restricted"]).optional(),
});

// --- Combined Portfolio Schema ---

export const portfolioDataSchema = z.object({
  privacy_mode: z.enum(["open", "progressive", "private"]).optional(),
  personal: personalSchema,
  vitals: vitalsSchema.optional(),
  astrology: astrologySchema.optional(),
  education: educationSchema.optional(),
  career: careerSchema.optional(),
  family: familySchema.optional(),
  lifestyle: lifestyleSchema.optional(),
  contact: contactSchema.optional(),
  style: styleSchema.optional(),
  preferences: preferencesSchema.optional(),
  visibility: visibilitySchema.optional(),
  access: accessSchema.optional(),
});

// Drafts can be persisted before the required publishing details are complete.
export const portfolioDraftSchema = portfolioDataSchema.extend({
  personal: personalSchema.partial(),
});

export type PortfolioData = z.infer<typeof portfolioDataSchema>;
export type PersonalData = z.infer<typeof personalSchema>;
export type VitalsData = z.infer<typeof vitalsSchema>;
export type AstrologyData = z.infer<typeof astrologySchema>;
export type EducationData = z.infer<typeof educationSchema>;
export type CareerData = z.infer<typeof careerSchema>;
export type FamilyData = z.infer<typeof familySchema>;
export type LifestyleData = z.infer<typeof lifestyleSchema>;
export type ContactData = z.infer<typeof contactSchema>;
export type StyleData = z.infer<typeof styleSchema>;
export type PreferencesData = z.infer<typeof preferencesSchema>;
export type VisibilityData = z.infer<typeof visibilitySchema>;
export type AccessData = z.infer<typeof accessSchema>;

export type PortfolioMediaVisibility =
  | "public"
  | "blurred"
  | "interest_required"
  | "approved_only"
  | "owner_only"
  | "hidden";

export interface PortfolioMedia {
  id: string;
  portfolio_id: string;
  storage_path: string;
  thumbnail_path: string | null;
  media_type: "hero" | "gallery" | "family" | "horoscope" | "document" | "verification";
  visibility: PortfolioMediaVisibility;
  sort_order: number;
  alt_text: string | null;
  metadata?: PortfolioMediaMetadata | null;
}

export type PortfolioPhotoOrientation = "portrait" | "landscape" | "square" | "unknown";

export interface PortfolioMediaMetadata {
  width?: number;
  height?: number;
  aspectRatio?: number;
  orientation?: PortfolioPhotoOrientation;
  /** A deliberately low-detail derivative that is safe to show before approval. */
  blurPath?: string;
}

// --- Form Steps Config ---

export const FORM_STEPS = [
  { key: "personal", label: "Personal", icon: "User" },
  { key: "vitals", label: "Vitals", icon: "Heart" },
  { key: "astrology", label: "Astrology", icon: "Star" },
  { key: "education", label: "Education", icon: "GraduationCap" },
  { key: "career", label: "Career", icon: "Briefcase" },
  { key: "family", label: "Family", icon: "Users" },
  { key: "lifestyle", label: "Lifestyle", icon: "Music" },
  { key: "contact", label: "Contact", icon: "Phone" },
  { key: "style", label: "Style", icon: "Palette" },
] as const;

export type FormStepKey = (typeof FORM_STEPS)[number]["key"];

// --- Database Row Type ---

export interface Portfolio {
  id: string;
  user_id: string;
  share_token: string | null;
  draft_data: PortfolioData;
  published_data: PortfolioData | null;
  template_id: number;
  theme_color: string | null;
  sun_sign: string | null;
  is_published: boolean;
  published_at: string | null;
  expires_at: string | null;
  last_renewed_at: string | null;
  privacy_mode?: "open" | "progressive" | "private";
  visibility_settings?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
