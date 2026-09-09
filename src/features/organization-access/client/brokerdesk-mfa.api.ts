type Completion = { next: string };
type ApiError = { error?: string };

export async function completeBrokerdeskMfa(): Promise<Completion> {
  const response = await fetch("/api/v1/brokerdesk/reauth/complete", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const payload = await response.json().catch(() => null) as (Completion & ApiError) | null;
  if (!response.ok || !payload?.next) {
    throw new Error(payload?.error || "We could not complete the security check. Please try again.");
  }
  return payload;
}
