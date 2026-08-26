import type { GrantAction } from "@/features/access/server/access.contract";

export type AccessApiResult =
  | { ok: true; status: string; expiresAt?: string }
  | { ok: false; error: string; code: string; status: number };

/** Calls the owner grant endpoint and converts transport failures into display-safe errors. */
export async function manageAccessGrantRequest(
  grantId: string,
  action: GrantAction
): Promise<AccessApiResult> {
  try {
    const response = await fetch(`/api/access-grants/${encodeURIComponent(grantId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const body = (await response.json().catch(() => null)) as {
      status?: string;
      expiresAt?: string;
      error?: string;
      code?: string;
    } | null;
    if (!response.ok) {
      return {
        ok: false,
        error: body?.error || "This access change could not be saved.",
        code: body?.code || "ACCESS_REQUEST_FAILED",
        status: response.status,
      };
    }
    return { ok: true, status: body?.status || action, expiresAt: body?.expiresAt };
  } catch {
    return {
      ok: false,
      error: "We could not reach Nakshatra. Check your connection and try again.",
      code: "NETWORK_UNAVAILABLE",
      status: 0,
    };
  }
}
