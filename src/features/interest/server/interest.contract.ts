import { z } from "zod/v4";

export const interestRequestSchema = z.object({
  portfolioToken: z.string().min(8).max(160).regex(/^[A-Za-z0-9_-]+$/),
  name: z.string().trim().min(2).max(180),
  profileFor: z.enum(["self", "son", "daughter", "sibling", "relative"]),
  phone: z.string().trim().min(7).max(40),
  email: z.string().trim().email().max(180),
  location: z.string().trim().min(2).max(180),
  familyContext: z.string().trim().min(10).max(600),
  message: z.string().trim().min(5).max(600),
  portfolioUrl: z.union([
    z.literal(""),
    z.string().trim().url().max(500).refine(
      (value) => new URL(value).protocol === "https:",
      "Portfolio links must use HTTPS"
    ),
  ]).optional(),
});

export type InterestRequestInput = z.infer<typeof interestRequestSchema>;
