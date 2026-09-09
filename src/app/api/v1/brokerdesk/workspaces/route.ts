import { getApiUser } from "@/lib/auth";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";
import { readJsonBody, requestSecurityErrorResponse, requireSameOrigin } from "@/lib/api/request-security";
import { enforceRateLimit } from "@/features/security/server/rate-limit.service";
import { createBrokerdeskWorkspaceCommandSchema } from "@/features/organizations/server/brokerdesk-onboarding.contract";
import { createBrokerdeskWorkspace } from "@/features/organizations/server/brokerdesk-onboarding.service";
import {
  BROKERDESK_ONBOARDING_BODY_LIMIT,
  brokerdeskJson,
  brokerdeskOnboardingErrorResponse,
} from "@/features/organizations/server/brokerdesk-onboarding.http";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
  } catch (error) {
    return requestSecurityErrorResponse(error);
  }
  const auth = await getApiUser();
  if (auth.status !== "authenticated") return apiAuthFailureResponse(auth);
  const rateLimited = await enforceRateLimit(auth.supabase, request, "brokerdesk_workspace_create");
  if (rateLimited) return rateLimited;
  try {
    const command = createBrokerdeskWorkspaceCommandSchema.parse(
      await readJsonBody(request, BROKERDESK_ONBOARDING_BODY_LIMIT)
    );
    const result = await createBrokerdeskWorkspace(auth.supabase, command.profile, command.idempotencyKey);
    return brokerdeskJson(result, { status: 201 });
  } catch (error) {
    return brokerdeskOnboardingErrorResponse(error);
  }
}
