import { getApiUser } from "@/lib/auth";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";
import { readJsonBody, requestSecurityErrorResponse, requireSameOrigin } from "@/lib/api/request-security";
import { enforceRateLimit } from "@/features/security/server/rate-limit.service";
import { saveBrokerdeskOnboardingCommandSchema } from "@/features/organizations/server/brokerdesk-onboarding.contract";
import { saveBrokerdeskOnboarding } from "@/features/organizations/server/brokerdesk-onboarding.service";
import {
  BROKERDESK_ONBOARDING_BODY_LIMIT,
  brokerdeskJson,
  brokerdeskOnboardingErrorResponse,
} from "@/features/organizations/server/brokerdesk-onboarding.http";

type Context = { params: Promise<{ workspaceRef: string }> };

export async function PUT(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
  } catch (error) {
    return requestSecurityErrorResponse(error);
  }
  const auth = await getApiUser();
  if (auth.status !== "authenticated") return apiAuthFailureResponse(auth);
  const rateLimited = await enforceRateLimit(auth.supabase, request, "brokerdesk_onboarding_write");
  if (rateLimited) return rateLimited;
  try {
    const { workspaceRef } = await context.params;
    const command = saveBrokerdeskOnboardingCommandSchema.parse(
      await readJsonBody(request, BROKERDESK_ONBOARDING_BODY_LIMIT)
    );
    return brokerdeskJson(await saveBrokerdeskOnboarding(
      auth.supabase,
      workspaceRef,
      command.profile,
      command.expectedVersion,
      command.submitForVerification,
      command.idempotencyKey
    ));
  } catch (error) {
    return brokerdeskOnboardingErrorResponse(error);
  }
}
