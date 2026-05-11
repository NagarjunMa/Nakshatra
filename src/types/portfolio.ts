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
  photo_url: z.string().url().optional(),
  photo_thumb_url: z.string().url().optional(),
  dob: z
    .string()
    .min(1, "Date of birth is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  place_of_birth: z.string().max(200).optional(),
  gender: z.enum(["male", "female"]),
});

export const vitalsSchema = z.object({
  height: z.string().max(50).optional(),
  complexion: z.string().max(100).optional(),
  gotra: z.string().max(100).optional(),
});

export const astrologySchema = z.object({
  rashi: z.enum(["", ...RASHI_KEYS]).optional(),
  nakshatra: z.string().max(100).optional(),
  time_of_birth: z
    .union([
      z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format"),
      z.literal(""),
    ])
    .optional(),
});

export const educationSchema = z.object({
  degree: z.string().max(200).optional(),
  institution: z.string().max(200).optional(),
  year: z.string().max(10).optional(),
});

export const careerSchema = z.object({
  title: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
});

const familyMemberSchema = z.object({
  name: z.string().max(100).optional(),
  occupation: z.string().max(200).optional(),
});

export const familySchema = z.object({
  father: familyMemberSchema.optional(),
  mother: familyMemberSchema.optional(),
  siblings: z.array(familyMemberSchema).max(10, "Maximum 10 siblings").optional(),
});

export const lifestyleSchema = z.object({
  hobbies: z.string().max(500).optional(),
  languages: z.string().max(300).optional(),
  diet: z.string().max(100).optional(),
  music: z.string().max(300).optional(),
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
});

export const styleSchema = z.object({
  theme_color: z
    .union([
      z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid color"),
      z.literal(""),
    ])
    .optional(),
  rashi_palette: z.string().max(100).optional(),
});

// --- Combined Portfolio Schema ---

export const portfolioDataSchema = z.object({
  personal: personalSchema,
  vitals: vitalsSchema.optional(),
  astrology: astrologySchema.optional(),
  education: educationSchema.optional(),
  career: careerSchema.optional(),
  family: familySchema.optional(),
  lifestyle: lifestyleSchema.optional(),
  contact: contactSchema.optional(),
  style: styleSchema.optional(),
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
  created_at: string;
  updated_at: string;
}
