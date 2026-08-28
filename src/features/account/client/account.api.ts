export type AccountApiFailure = { ok: false; code: string; message: string; status: number };
export type AccountApiResult<T> = { ok: true; data: T } | AccountApiFailure;

async function accountRequest<T>(url: string, init: RequestInit): Promise<AccountApiResult<T>> {
  try {
    const response = await fetch(url, init);
    const body = (await response.json().catch(() => null)) as (T & { code?: string; error?: string }) | null;
    if (!response.ok) {
      return {
        ok: false,
        code: body?.code || "ACCOUNT_REQUEST_FAILED",
        message: body?.error || "We could not complete that account action.",
        status: response.status,
      };
    }
    return { ok: true, data: body as T };
  } catch {
    return { ok: false, code: "NETWORK_UNAVAILABLE", message: "Nakshatra is temporarily unreachable.", status: 0 };
  }
}

/** Downloads the authenticated user's JSON export without interpreting its private contents. */
export async function downloadAccountExportRequest(): Promise<AccountApiResult<Blob>> {
  try {
    const response = await fetch("/api/account/export", { method: "GET" });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { code?: string; error?: string } | null;
      return {
        ok: false,
        code: body?.code || "ACCOUNT_EXPORT_FAILED",
        message: body?.error || "We could not prepare your account export.",
        status: response.status,
      };
    }
    return { ok: true, data: await response.blob() };
  } catch {
    return { ok: false, code: "NETWORK_UNAVAILABLE", message: "Nakshatra is temporarily unreachable.", status: 0 };
  }
}

/** Revokes every Supabase session except the browser making this request. */
export function revokeOtherSessionsRequest() {
  return accountRequest<{ ok: true }>("/api/account/sessions", { method: "DELETE" });
}

/** Schedules privacy-safe account deletion after the recovery window. */
export function requestAccountDeletionRequest() {
  return accountRequest<{ status: string; scheduledFor?: string; organizationCount?: number }>(
    "/api/account/deletion",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation: "DELETE" }),
    }
  );
}

/** Starts deletion-only fresh authentication without allowing a caller-selected email address. */
export function startAccountDeletionReauthRequest(method: "google" | "email") {
  return accountRequest<{ url?: string; sent?: boolean }>(
    "/api/account/reauth/start",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method }),
    }
  );
}

/** Cancels a deletion that has not entered processing. */
export function cancelAccountDeletionRequest() {
  return accountRequest<{ ok: true }>("/api/account/deletion", { method: "DELETE" });
}

/** Clears stale browser credentials after the database atomically revokes every Auth session. */
export async function clearLocalAccountSession() {
  const { createClient } = await import("@/lib/supabase/client");
  await createClient().auth.signOut({ scope: "local" });
}

