import { z } from "zod/v4";

const optionalText = (maximum: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().max(maximum).optional()
);

export const interestRequestSchema = z.object({
  portfolioToken: z.string().min(8).max(160).regex(/^[A-Za-z0-9_-]+$/),
  name: z.string().trim().min(2).max(180),
  profileFor: z.enum(["self", "son", "daughter", "sibling", "relative"]),
  phone: z.string().trim().min(7).max(40),
  email: z.string().trim().email().max(180),
  country: optionalText(100),
  state: optionalText(120),
  city: optionalText(120),
  familyContext: optionalText(600),
  message: optionalText(600),
  portfolioUrl: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().url().max(500).refine(
      (value) => new URL(value).protocol === "https:",
      "Portfolio links must use HTTPS"
    ).optional()
  ),
});

export type InterestRequestInput = z.infer<typeof interestRequestSchema>;
