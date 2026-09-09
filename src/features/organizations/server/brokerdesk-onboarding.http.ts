import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod/v4";
import { BrokerdeskOnboardingError } from "./brokerdesk-onboarding.service";

export const BROKERDESK_ONBOARDING_BODY_LIMIT = 32 * 1024;

export function brokerdeskJson(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "private, no-store");
  return NextResponse.json(body, { ...init, headers });
}
export function brokerdeskOnboardingErrorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return brokerdeskJson(
      { code: "BROKERDESK_ONBOARDING_INVALID", error: "Some business details are invalid." },
      { status: 400 }
    );
  }
  if (error instanceof BrokerdeskOnboardingError) {
    return brokerdeskJson({ code: error.code, error: error.message }, { status: error.status });
  }
  return brokerdeskJson(
    { code: "BROKERDESK_ONBOARDING_FAILED", error: "BrokerDesk onboarding is temporarily unavailable." },
    { status: 503 }
  );
}
