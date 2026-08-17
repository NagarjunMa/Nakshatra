import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { getApiUser } from "@/lib/auth";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";
import { grantActionSchema } from "@/features/access/server/access.contract";
import {
  AccessLifecycleError,
  managePortfolioGrant,
} from "@/features/access/server/access.service";

/** Renews or revokes one Full View grant owned by the authenticated portfolio manager. */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getApiUser();
  if (auth.status !== "authenticated") return apiAuthFailureResponse(auth);

  const { id } = await context.params;
  const grantId = z.string().uuid().safeParse(id);
  const body = grantActionSchema.safeParse(await request.json().catch(() => null));
  if (!grantId.success || !body.success) {
    return NextResponse.json(
      { code: "ACCESS_ACTION_INVALID", error: "Choose a valid access action." },
      { status: 400 }
    );
  }

  try {
    return NextResponse.json(
      await managePortfolioGrant(auth.supabase, grantId.data, body.data.action)
    );
  } catch (error) {
    const lifecycleError = error instanceof AccessLifecycleError ? error : null;
    return NextResponse.json(
      {
        code: lifecycleError?.code || "ACCESS_ACTION_FAILED",
        error: lifecycleError?.message || "This access change could not be saved.",
      },
      { status: lifecycleError?.status || 500 }
    );
  }
}
