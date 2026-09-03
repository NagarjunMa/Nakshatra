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

/** Returns a clear form-level message for the first invalid interest field. */
export function interestRequestValidationMessage(error: z.ZodError) {
  const invalidFields = new Set(error.issues.map((issue) => issue.path[0]));

  if (invalidFields.has("portfolioToken")) {
    return "This portfolio link is invalid. Open the original shared link and try again.";
  }
  if (invalidFields.has("name")) return "Enter your full name.";
  if (invalidFields.has("profileFor")) return "Choose who you are contacting for.";
  if (invalidFields.has("phone")) return "Enter a valid phone number.";
  if (invalidFields.has("email")) return "Enter a valid email address.";
  if (invalidFields.has("portfolioUrl")) {
    return "Use a secure portfolio link beginning with https://, or leave this optional field blank. Localhost links cannot be shared.";
  }

  return "One of the optional details is too long. Shorten it and try again.";
}
