import { z } from "zod/v4";
import { portfolioDataSchema } from "@/types/portfolio";

export const publicMediaDescriptorSchema = z.object({
  key: z.string().min(1).max(64),
  accessPath: z.string().min(1).max(1024),
  altText: z.string().max(160).nullable().optional(),
  mediaType: z.enum(["hero", "gallery"]),
  sortOrder: z.number().int().nonnegative(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  aspectRatio: z.number().positive().optional(),
  orientation: z.enum(["portrait", "landscape", "square", "unknown"]).optional(),
  presentation: z.enum(["clear", "blurred"]),
});

export const resolvedPortfolioSchema = z.object({
  data: portfolioDataSchema,
  templateId: z.number().int().positive(),
  themeColor: z.string().nullable().optional(),
  sunSign: z.string().nullable().optional(),
  accessExpiresAt: z.string().refine((value) => Number.isFinite(Date.parse(value))).optional(),
  horoscope: z.object({
    fileExtension: z.literal("webp"),
    languageLabel: z.string().nullable().optional(),
    pageCount: z.number().int().positive().nullable().optional(),
  }).nullable().optional(),
  media: z.array(publicMediaDescriptorSchema).max(8),
});

export const approvedHoroscopeSchema = z.object({
  accessPath: z.string().min(1).max(1024),
  mimeType: z.literal("image/webp"),
  fileExtension: z.literal("webp"),
  languageLabel: z.string().nullable().optional(),
  pageCount: z.number().int().positive().nullable().optional(),
  profileName: z.string().nullable().optional(),
  accessExpiresAt: z.string().refine((value) => Number.isFinite(Date.parse(value))),
});

export type PublicMediaDescriptor = z.infer<typeof publicMediaDescriptorSchema>;
export type ResolvedPortfolio = z.infer<typeof resolvedPortfolioSchema>;
export type ApprovedHoroscope = z.infer<typeof approvedHoroscopeSchema>;
