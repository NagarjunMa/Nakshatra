import { NextResponse } from "next/server";
import { exportAccountData, AccountPrivacyError } from "@/features/account/server/account.service";
import { enforceRateLimit } from "@/features/security/server/rate-limit.service";
import { getApiUser } from "@/lib/auth";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";

/** Downloads one authenticated user's portable account record without exposing other requesters' PII. */
export async function GET(request: Request) {
  const auth = await getApiUser();
  if (auth.status !== "authenticated") return apiAuthFailureResponse(auth);
  const rateLimited = await enforceRateLimit(auth.supabase, request, "account_export");
  if (rateLimited) return rateLimited;

  try {
    const data = await exportAccountData(auth.supabase);
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Disposition": `attachment; filename="nakshatra-account-${new Date().toISOString().slice(0, 10)}.json"`,
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    const known = error instanceof AccountPrivacyError ? error : null;
    return NextResponse.json(
      { code: known?.code || "ACCOUNT_EXPORT_FAILED", error: known?.message || "Your account export is temporarily unavailable." },
      { status: known?.status || 503 }
    );
  }
}

