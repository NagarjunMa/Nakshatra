import { z } from "zod/v4";
import { workspaceRefSchema } from "@/features/security/public-reference";

export const brokerdeskBusinessTypeSchema = z.enum([
  "sole_proprietorship",
  "partnership",
  "private_limited",
  "public_limited",
  "nonprofit",
  "other",
]);

const countrySchema = z.string().trim().length(2).transform((value) => value.toUpperCase());
const optionalText = (maximum: number) => z.string().trim().max(maximum).nullable().optional();

export const brokerdeskBusinessProfileSchema = z.object({
  legalName: z.string().trim().min(2).max(160),
  tradingName: optionalText(160),
  businessType: brokerdeskBusinessTypeSchema,
  registrationNumber: optionalText(80),
  registrationCountry: countrySchema.nullable().optional(),
  primaryCity: z.string().trim().min(2).max(100),
  primaryRegion: optionalText(100),
  primaryCountry: countrySchema,
}).strict();

export const brokerdeskProfileUpdateSchema = brokerdeskBusinessProfileSchema.partial().extend({
  representativeFullName: optionalText(120),
  representativePosition: optionalText(120),
  representativeWorkEmail: z.email().max(254).nullable().optional(),
  representativeWorkPhone: z.string().trim().min(7).max(30).regex(/^\+?[0-9 ()-]+$/).nullable().optional(),
  authorityContext: z.string().trim().min(10).max(1000).nullable().optional(),
  serviceRegions: z.array(z.string().trim().min(2).max(120)).max(20).optional(),
  operatingSinceYear: z.number().int().min(1800).max(new Date().getUTCFullYear()).nullable().optional(),
  website: z.url().refine((value) => value.startsWith("https://"), "Website must use HTTPS").nullable().optional(),
  authorityDeclared: z.boolean().optional(),
  termsAccepted: z.boolean().optional(),
}).strict();

export const brokerdeskVerificationTypeSchema = z.enum([
  "representative_identity",
  "business_registration",
  "business_contact",
]);
export const brokerdeskVerificationStatusSchema = z.enum([
  "required", "under_review", "verified", "needs_attention", "expired",
]);
export const brokerdeskOnboardingStatusSchema = z.enum([
  "draft", "ready_for_verification", "under_review", "needs_attention", "approved",
]);
export const brokerdeskOnboardingStageSchema = z.enum([
  "business", "representative", "practice", "review", "verification", "complete",
]);

const nullableString = z.string().nullable();
export const brokerdeskOnboardingSchema = z.object({
  available: z.literal(true),
  workspaceRef: workspaceRefSchema,
  workspaceName: z.string(),
  workspaceStatus: z.enum(["onboarding", "active"]),
  onboardingStatus: brokerdeskOnboardingStatusSchema,
  nextStage: brokerdeskOnboardingStageSchema,
  version: z.number().int().positive(),
  profile: z.object({
    legalName: z.string(),
    tradingName: nullableString,
    businessType: brokerdeskBusinessTypeSchema,
    registrationNumber: nullableString,
    registrationCountry: nullableString,
    primaryCity: z.string(),
    primaryRegion: nullableString,
    primaryCountry: z.string(),
    representativeFullName: nullableString,
    representativePosition: nullableString,
    representativeWorkEmail: nullableString,
    representativeWorkPhone: nullableString,
    authorityContext: nullableString,
    serviceRegions: z.array(z.string()),
    operatingSinceYear: z.number().int().nullable(),
    website: nullableString,
    authorityDeclared: z.boolean(),
    termsAccepted: z.boolean(),
  }).strict(),
  verificationChecks: z.array(z.object({
    type: brokerdeskVerificationTypeSchema,
    status: brokerdeskVerificationStatusSchema,
    expiresAt: nullableString,
    attentionReason: nullableString,
  }).strict()).length(3),
}).strict();

export const unavailableBrokerdeskOnboardingSchema = z.object({ available: z.literal(false) }).strict();
export const brokerdeskOnboardingResultSchema = z.discriminatedUnion("available", [
  unavailableBrokerdeskOnboardingSchema,
  brokerdeskOnboardingSchema,
]);

const workspaceSummarySchema = z.object({
  workspaceRef: workspaceRefSchema,
  workspaceName: z.string(),
  workspaceStatus: z.enum(["onboarding", "active"]),
  onboardingStatus: brokerdeskOnboardingStatusSchema.nullable(),
  nextStage: brokerdeskOnboardingStageSchema.nullable(),
  rolePreset: z.enum(["owner", "admin", "advisor", "coordinator", "viewer"]),
}).strict();

export const brokerdeskBootstrapSchema = z.object({
  workspaces: z.array(workspaceSummarySchema),
  nextAction: z.enum(["create_workspace", "resume_onboarding", "open_workspace", "choose_workspace"]),
}).strict();

export const createBrokerdeskWorkspaceCommandSchema = z.object({
  profile: brokerdeskBusinessProfileSchema,
  idempotencyKey: z.string().min(16).max(128).regex(/^[A-Za-z0-9_.:-]+$/),
}).strict();

export const saveBrokerdeskOnboardingCommandSchema = z.object({
  profile: brokerdeskProfileUpdateSchema,
  expectedVersion: z.number().int().positive(),
  submitForVerification: z.boolean().default(false),
  idempotencyKey: z.string().min(16).max(128).regex(/^[A-Za-z0-9_.:-]+$/),
}).strict();

export const startBrokerdeskRepresentativeVerificationSchema = z.object({
  birthDate: z.iso.date(),
  consent: z.literal(true),
}).strict().superRefine((value, context) => {
  const birthDate = new Date(`${value.birthDate}T00:00:00.000Z`);
  const today = new Date();
  const minimumAdultDate = new Date(Date.UTC(
    today.getUTCFullYear() - 18,
    today.getUTCMonth(),
    today.getUTCDate()
  ));
  const oldestReasonableDate = new Date(Date.UTC(today.getUTCFullYear() - 120, 0, 1));
  if (birthDate > minimumAdultDate || birthDate < oldestReasonableDate) {
    context.addIssue({ code: "custom", path: ["birthDate"], message: "Enter a valid adult date of birth" });
  }
});

export type BrokerdeskBootstrap = z.infer<typeof brokerdeskBootstrapSchema>;
export type BrokerdeskOnboarding = z.infer<typeof brokerdeskOnboardingSchema>;
export type BrokerdeskOnboardingResult = z.infer<typeof brokerdeskOnboardingResultSchema>;
export type BrokerdeskBusinessProfile = z.infer<typeof brokerdeskBusinessProfileSchema>;
export type BrokerdeskProfileUpdate = z.infer<typeof brokerdeskProfileUpdateSchema>;
