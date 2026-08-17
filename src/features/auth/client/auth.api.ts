type AuthStartPayload =
  | { method: "google"; redirect: string }
  | { method: "email"; email: string; redirect: string };

type AuthStartResponse = { url?: string; sent?: boolean; error?: string };

/** Calls the same-origin auth gateway so provider requests receive application rate limiting. */
export async function startAuthentication(payload: AuthStartPayload) {
  const response = await fetch("/api/auth/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = (await response.json().catch(() => null)) as AuthStartResponse | null;
  return { ok: response.ok, body };
}

/** Leaves the application only for the provider URL returned by the trusted auth gateway. */
export function continueToAuthProvider(url: string) {
  window.location.assign(url);
}
