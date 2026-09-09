import { getApiUser } from "@/lib/auth";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";
import { enforceRateLimit } from "@/features/security/server/rate-limit.service";
import { getBrokerdeskOnboarding } from "@/features/organizations/server/brokerdesk-onboarding.service";
import { brokerdeskJson, brokerdeskOnboardingErrorResponse } from "@/features/organizations/server/brokerdesk-onboarding.http";

type Context = { params: Promise<{ workspaceRef: string }> };

export async function GET(request: Request, context: Context) {
  const auth = await getApiUser();
  if (auth.status !== "authenticated") return apiAuthFailureResponse(auth);
  const rateLimited = await enforceRateLimit(auth.supabase, request, "brokerdesk_onboarding_read");
  if (rateLimited) return rateLimited;
  try {
    const { workspaceRef } = await context.params;
    const result = await getBrokerdeskOnboarding(auth.supabase, workspaceRef);
    return result.available
      ? brokerdeskJson(result)
      : brokerdeskJson({ code: "BROKERDESK_WORKSPACE_UNAVAILABLE", error: "Workspace unavailable." }, { status: 404 });
  } catch (error) {
    return brokerdeskOnboardingErrorResponse(error);
  }
}
