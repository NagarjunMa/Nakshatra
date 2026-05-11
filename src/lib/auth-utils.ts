/**
 * Check if a Supabase error is an auth/session error.
 * Safe to import in client components.
 */
export function isAuthError(
  error: { code?: string; message?: string } | null
): boolean {
  if (!error) return false;
  const authCodes = ["PGRST301", "PGRST302", "42501"];
  if (authCodes.includes(error.code ?? "")) return true;
  const msg = error.message?.toLowerCase() ?? "";
  return (
    msg.includes("jwt") ||
    msg.includes("token") ||
    msg.includes("not authenticated")
  );
}
