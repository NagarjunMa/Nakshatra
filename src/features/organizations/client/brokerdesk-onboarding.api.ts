import type {
  BrokerdeskBusinessProfile,
  BrokerdeskOnboarding,
  BrokerdeskProfileUpdate,
} from "@/features/organizations/server/brokerdesk-onboarding.contract";
import {
  identityVerificationRequest,
  type HostedIdentityVerification,
} from "@/features/identity-verification/client/identity-verification.api";

type ApiError = { code?: string; error?: string };

async function command<T>(url: string, method: "POST" | "PUT", body: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null) as (T & ApiError) | null;
  if (!response.ok || !payload) {
    throw new Error(payload?.error || "We could not save your details. Please try again.");
  }
  return payload;
}
export function createWorkspace(profile: BrokerdeskBusinessProfile, idempotencyKey: string) {
  return command<BrokerdeskOnboarding>("/api/v1/brokerdesk/workspaces", "POST", { profile, idempotencyKey });
}

export function saveOnboarding(
  workspaceRef: string,
  profile: BrokerdeskProfileUpdate,
  expectedVersion: number,
  submitForVerification: boolean,
  idempotencyKey: string
) {
  return command<BrokerdeskOnboarding>(
    `/api/v1/brokerdesk/workspaces/${encodeURIComponent(workspaceRef)}/business-profile`,
    "PUT",
    { profile, expectedVersion, submitForVerification, idempotencyKey }
  );
}

export function startRepresentativeVerification(
  workspaceRef: string,
  birthDate: string
) {
  return identityVerificationRequest<HostedIdentityVerification>(
    `/api/v1/brokerdesk/workspaces/${encodeURIComponent(workspaceRef)}/representative-verification`,
    {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ birthDate, consent: true }),
    }
  );
}
