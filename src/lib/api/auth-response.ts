import { NextResponse } from "next/server";
import type { ApiUserResult } from "@/lib/auth";

type ApiAuthFailure = Exclude<ApiUserResult, { status: "authenticated" }>;

/**
 * Converts a failed API authentication result into a frontend-safe HTTP response.
 * Input: a non-authenticated API user result. Output: a status, stable error code, and actionable message.
 */
export function apiAuthFailureResponse(auth: ApiAuthFailure) {
  switch (auth.status) {
    case "missing_session":
      return NextResponse.json(
        { code: "AUTH_SESSION_MISSING", error: "Your session has ended. Sign in to continue." },
        { status: 401 }
      );
    case "invalid_session":
      return NextResponse.json(
        { code: "AUTH_SESSION_INVALID", error: "We could not verify your session. Sign in again to continue." },
        { status: 401 }
      );
    case "service_unavailable":
      return NextResponse.json(
        { code: "AUTH_SERVICE_UNAVAILABLE", error: "Authentication is temporarily unavailable. Please try again shortly." },
        { status: 503 }
      );
  }
}
