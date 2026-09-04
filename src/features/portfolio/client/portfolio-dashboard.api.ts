import type { PortfolioData, PortfolioHoroscope, PortfolioMedia } from "@/types/portfolio";

export type PortfolioApiFailure = {
  ok: false;
  error: { code: string; message: string; status: number };
};

export type PortfolioApiSuccess<T> = { ok: true; data: T };
export type PortfolioApiResult<T> = PortfolioApiSuccess<T> | PortfolioApiFailure;

type ApiErrorBody = { code?: string; error?: string };

/**
 * Calls a portfolio dashboard endpoint and normalizes transport and API errors for the UI.
 * Input: request URL and optional JSON body. Output: a typed success payload or display-safe failure.
 */
async function requestPortfolioApi<T>(url: string, init: RequestInit): Promise<PortfolioApiResult<T>> {
  try {
    const response = await fetch(url, init);
    const body = (await response.json().catch(() => null)) as (ApiErrorBody & T) | null;
    if (!response.ok) {
      return {
        ok: false,
        error: {
          code: body?.code || "PORTFOLIO_REQUEST_FAILED",
          message: body?.error || "We could not complete that portfolio action. Please try again.",
          status: response.status,
        },
      };
    }

    return { ok: true, data: body as T };
  } catch {
    return {
      ok: false,
      error: {
        code: "NETWORK_UNAVAILABLE",
        message: "We could not reach Nakshatra. Check your connection and try again.",
        status: 0,
      },
    };
  }
}

/** Publishes the supplied private draft into the owner's sanitized public snapshot. */
export function publishPortfolioRequest(data: PortfolioData) {
  return requestPortfolioApi<{ shareUrl: string; expiresAt: string; action: "created" | "updated" }>(
    "/api/portfolio/publish",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data }) }
  );
}

/** Saves an editable dashboard draft without changing the published snapshot. */
export function saveDashboardDraftRequest(data: PortfolioData) {
  return requestPortfolioApi<{ portfolioId: string }>(
    "/api/dashboard",
    { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data }) }
  );
}

/** Extends an already published portfolio link for another 90 days. */
export function renewPortfolioLinkRequest() {
  return requestPortfolioApi<{ ok: true }>("/api/portfolio/renew", { method: "POST" });
}

/** Replaces the current public portfolio token after explicit owner confirmation. */
export function rotatePortfolioLinkRequest() {
  return requestPortfolioApi<{ shareUrl: string }>("/api/portfolio/share/rotate", { method: "POST" });
}

/** Disables public access while retaining the owner's draft and media. */
export function unpublishPortfolioRequest() {
  return requestPortfolioApi<{ ok: true }>("/api/portfolio/share/unpublish", { method: "POST" });
}

/** Uploads one owner photo and returns the persisted media record. */
export function uploadPortfolioPhotoRequest(formData: FormData) {
  return requestPortfolioApi<{ media: PortfolioMedia; previewUrl: string | null }>("/api/portfolio-media", {
    method: "POST",
    body: formData,
  });
}

/** Updates the owner-controlled visibility, role, or alternative text of a photo. */
export function updatePortfolioPhotoRequest(
  mediaId: string,
  changes: Partial<Pick<PortfolioMedia, "visibility" | "media_type" | "alt_text">>
) {
  return requestPortfolioApi<{ media: PortfolioMedia }>("/api/portfolio-media", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mediaId, ...changes }),
  });
}

/** Deletes one owner photo and its associated storage objects. */
export function deletePortfolioPhotoRequest(mediaId: string) {
  return requestPortfolioApi<{ ok: true }>(
    `/api/portfolio-media?mediaId=${encodeURIComponent(mediaId)}`,
    { method: "DELETE" }
  );
}

/** Uploads or safely replaces the owner's single approved-viewer horoscope attachment. */
export function uploadHoroscopeRequest(formData: FormData) {
  return requestPortfolioApi<{ horoscope: PortfolioHoroscope }>("/api/portfolio-horoscope", {
    method: "POST",
    body: formData,
  });
}

/** Revokes and deletes the owner's horoscope attachment. */
export function deleteHoroscopeRequest(horoscopeId: string) {
  return requestPortfolioApi<{ ok: true }>(
    `/api/portfolio-horoscope?horoscopeId=${encodeURIComponent(horoscopeId)}`,
    { method: "DELETE" }
  );
}
