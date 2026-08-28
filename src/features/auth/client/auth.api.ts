export type AuthStartPayload =
  | { method: "google"; redirect: string }
  | { method: "password_signup"; name: string; email: string; password: string; redirect: string }
  | { method: "password_signin"; email: string; password: string; redirect: string }
  | { method: "email_otp"; email: string; redirect: string }
  | { method: "resend_signup"; email: string; redirect: string }
  | { method: "password_recovery"; email: string };

type AuthResponse = {
  url?: string;
  sent?: boolean;
  authenticated?: boolean;
  verificationRequired?: boolean;
  verified?: boolean;
  updated?: boolean;
  email?: string;
  redirect?: string;
  error?: string;
  code?: string;
};

async function postAuth(path: string, payload: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = (await response.json().catch(() => null)) as AuthResponse | null;
  return { ok: response.ok, body };
}

/** Calls the same-origin auth gateway so every provider receives application rate limiting. */
export function startAuthentication(payload: AuthStartPayload) {
  return postAuth("/api/auth/start", payload);
}

/** Exchanges a six-digit email code for an authenticated session. */
export function verifyAuthenticationCode(payload: {
  purpose: "owner_signup" | "viewer_interest";
  email: string;
  token: string;
  redirect: string;
}) {
  return postAuth("/api/auth/verify", payload);
}

/** Finishes a password-recovery session with a replacement password. */
export function updateRecoveredPassword(password: string) {
  return postAuth("/api/auth/password", { password });
}

/** Leaves the application only for the provider URL returned by the trusted auth gateway. */
export function continueToAuthProvider(url: string) {
  window.location.assign(url);
}
