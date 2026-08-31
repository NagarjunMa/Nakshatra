import "server-only";

import { z } from "zod/v4";

const diditConfigSchema = z.object({
  DIDIT_API_KEY: z.string().min(1, "DIDIT_API_KEY is required"),
  DIDIT_WORKFLOW_ID: z.uuid("DIDIT_WORKFLOW_ID must be a UUID"),
});

const diditSessionSchema = z.object({
  session_id: z.string().min(8).max(128),
  url: z.url(),
}).passthrough();

const diditHostedOrigin = "https://verify.didit.me";

export class DiditProviderError extends Error {
  constructor(readonly code = "IDENTITY_VERIFICATION_PROVIDER_UNAVAILABLE") {
    super(code);
  }
}

function getDiditConfig() {
  const parsed = diditConfigSchema.safeParse({
    DIDIT_API_KEY: process.env.DIDIT_API_KEY,
    DIDIT_WORKFLOW_ID: process.env.DIDIT_WORKFLOW_ID,
  });
  if (!parsed.success) throw new DiditProviderError("IDENTITY_VERIFICATION_PROVIDER_UNAVAILABLE");
  return parsed.data;
}

function expectedName(legalName: string) {
  const names = legalName.trim().split(/\s+/).filter(Boolean);
  const firstName = names.shift();
  if (!firstName) throw new DiditProviderError("IDENTITY_VERIFICATION_DETAILS_UNAVAILABLE");
  return { first_name: firstName, ...(names.length > 0 ? { last_name: names.join(" ") } : {}) };
}

/** Creates a Didit hosted session without retaining its session token or provider evidence. */
export async function createDiditVerificationSession(input: {
  attemptId: string;
  providerSubjectRef: string;
  legalName: string;
  birthDate: string;
  callbackUrl: string;
}) {
  const config = getDiditConfig();
  let response: Response;
  try {
    response = await fetch("https://verification.didit.me/v3/session/", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": config.DIDIT_API_KEY },
      body: JSON.stringify({
        workflow_id: config.DIDIT_WORKFLOW_ID,
        vendor_data: `iv:${input.providerSubjectRef}:${input.attemptId}`,
        callback: input.callbackUrl,
        callback_method: "both",
        language: "en",
        expected_details: {
          ...expectedName(input.legalName),
          date_of_birth: input.birthDate,
          id_country: "IND",
          expected_document_types: ["P", "ID"],
        },
      }),
      cache: "no-store",
    });
  } catch {
    throw new DiditProviderError();
  }
  if (!response.ok) throw new DiditProviderError();

  const parsed = diditSessionSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success || new URL(parsed.data.url).origin !== diditHostedOrigin) {
    throw new DiditProviderError();
  }
  return { sessionId: parsed.data.session_id, url: parsed.data.url };
}
