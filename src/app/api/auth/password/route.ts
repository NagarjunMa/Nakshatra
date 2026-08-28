import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { getApiUser } from "@/lib/auth";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";
import {
  AUTH_BODY_LIMIT,
  readJsonBody,
  RequestSecurityError,
  requestSecurityErrorResponse,
  requireSameOrigin,
} from "@/lib/api/request-security";

const passwordSchema = z.object({
  password: z.string().min(8).max(72),
});

/** Sets a new password for the authenticated recovery session. */
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const auth = await getApiUser();
    if (auth.status !== "authenticated") return apiAuthFailureResponse(auth);
    const parsed = passwordSchema.safeParse(await readJsonBody(request, AUTH_BODY_LIMIT));
    if (!parsed.success) {
      return NextResponse.json(
        { code: "PASSWORD_INVALID", error: "Use at least eight characters." },
        { status: 400 }
      );
    }
    const { error } = await auth.supabase.auth.updateUser({ password: parsed.data.password });
    if (error) throw error;
    return NextResponse.json({ updated: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof RequestSecurityError) return requestSecurityErrorResponse(error);
    return NextResponse.json(
      { code: "PASSWORD_UPDATE_FAILED", error: "We could not update the password. Request a new recovery email and try again." },
      { status: 500 }
    );
  }
}
