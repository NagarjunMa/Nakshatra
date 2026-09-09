import { getApiUser } from "@/lib/auth";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";
import { enforceRateLimit } from "@/features/security/server/rate-limit.service";
import { getBrokerdeskBootstrap } from "@/features/organizations/server/brokerdesk-onboarding.service";
import { brokerdeskJson, brokerdeskOnboardingErrorResponse } from "@/features/organizations/server/brokerdesk-onboarding.http";

export async function GET(request: Request) {
  const auth = await getApiUser();
  if (auth.status !== "authenticated") return apiAuthFailureResponse(auth);
  const rateLimited = await enforceRateLimit(auth.supabase, request, "brokerdesk_bootstrap");
  if (rateLimited) return rateLimited;
  try {
    return brokerdeskJson(await getBrokerdeskBootstrap(auth.supabase));
  } catch (error) {
    return brokerdeskOnboardingErrorResponse(error);
  }
}
