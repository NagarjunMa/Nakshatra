async function command<T>(url: string, body: object): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => null) as (T & { error?: string }) | null;
  if (!response.ok || !result) throw new Error(result?.error || "This action is temporarily unavailable.");
  return result;
}

export function inviteBrokerdeskCustomer(
  workspaceRef: string,
  email: string,
  idempotencyKey: string
) {
  return command<{ invitationUrl: string; emailHint: string; expiresAt: string }>(
    `/api/v1/brokerdesk/workspaces/${encodeURIComponent(workspaceRef)}/customer-invitations`,
    { email, idempotencyKey }
  );
}

