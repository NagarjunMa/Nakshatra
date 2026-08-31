export type IdentityVerificationApiFailure = { ok: false; code: string; message: string; status: number; managementUrl?: string };
export type IdentityVerificationApiResult<T> = { ok: true; data: T } | IdentityVerificationApiFailure;
export type HostedIdentityVerification = { url: string; managementUrl: string };

async function identityVerificationRequest<T>(url: string, init: RequestInit): Promise<IdentityVerificationApiResult<T>> {
  try {
    const response = await fetch(url, init);
    const body = (await response.json().catch(() => null)) as (T & { code?: string; error?: string; managementUrl?: string }) | null;
    if (!response.ok) {
      return {
        ok: false,
        code: body?.code || "IDENTITY_VERIFICATION_REQUEST_FAILED",
        message: body?.error || "We could not complete identity verification.",
        status: response.status,
        ...(body?.managementUrl ? { managementUrl: body.managementUrl } : {}),
      };
    }
    return { ok: true, data: body as T };
  } catch {
    return { ok: false, code: "NETWORK_UNAVAILABLE", message: "Nakshatra is temporarily unreachable.", status: 0 };
  }
}

export type IdentityVerificationLink =
  | { kind: "invitation"; status: "ready" }
  | { kind: "management"; status: string; canRetry: boolean; canWithdraw: boolean };

export function getIdentityVerificationLinkRequest(token: string) {
  return identityVerificationRequest<{ link: IdentityVerificationLink }>("/api/identity-verification/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
}

export function startInvitationIdentityVerificationRequest(token: string) {
  return identityVerificationRequest<HostedIdentityVerification>("/api/identity-verification/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ authorization: "invitation", token, consent: true }),
  });
}

/** Begins the authenticated primary-owner verification path after the dashboard consent notice. */
export function startSelfIdentityVerificationRequest(candidateId: string) {
  return identityVerificationRequest<HostedIdentityVerification>("/api/identity-verification/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ authorization: "self", candidateId, consent: true }),
  });
}

/** Creates an opaque invitation for an accountless candidate; authorization is rechecked by the server. */
export function createIdentityVerificationInvitationRequest(candidateId: string) {
  return identityVerificationRequest<{ invitationUrl: string; expiresAt: string }>("/api/identity-verification/invitations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ candidateId }),
  });
}

export function retryIdentityVerificationRequest(token: string) {
  return identityVerificationRequest<HostedIdentityVerification>("/api/identity-verification/retry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
}

export function withdrawIdentityVerificationConsentRequest(token: string) {
  return identityVerificationRequest<{ withdrawn: true }>("/api/identity-verification/status", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
}
