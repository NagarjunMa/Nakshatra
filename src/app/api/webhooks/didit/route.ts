import { NextResponse } from "next/server";
import { readLimitedBody } from "@/lib/api/request-security";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { DiditWebhookError, verifyDiditWebhook } from "@/features/identity-verification/server/didit.webhook";
import { IdentityVerificationWebhookRepository } from "@/features/identity-verification/server/webhook.repository";

export const runtime = "nodejs";

const WEBHOOK_BODY_LIMIT = 1024 * 1024;
const noStore = { "Cache-Control": "no-store" };

/** Acknowledges only an authenticated, configuration-bound Didit event after durable private receipt. */
export async function POST(request: Request) {
  let rawBody: string;
  try {
    rawBody = new TextDecoder().decode(await readLimitedBody(request, WEBHOOK_BODY_LIMIT));
  } catch {
    return NextResponse.json({ code: "DIDIT_WEBHOOK_INVALID" }, { status: 400, headers: noStore });
  }

  try {
    const event = verifyDiditWebhook({
      rawBody,
      signature: request.headers.get("x-signature-v2"),
      timestamp: request.headers.get("x-timestamp"),
    });
    const { data, error } = await new IdentityVerificationWebhookRepository(createServiceRoleClient()).record(event);
    if (error || typeof data !== "boolean") {
      return NextResponse.json({ code: "DIDIT_WEBHOOK_UNAVAILABLE" }, { status: 503, headers: noStore });
    }
    // A signed event may refer to a retired or otherwise unknown local attempt.
    // It is not retryable at the provider, and acknowledging it reveals no mapping
    // information to the caller.
    return NextResponse.json({ accepted: true }, { status: 202, headers: noStore });
  } catch (error) {
    if (error instanceof DiditWebhookError) {
      return NextResponse.json({ code: error.code }, { status: 401, headers: noStore });
    }
    return NextResponse.json({ code: "DIDIT_WEBHOOK_UNAVAILABLE" }, { status: 503, headers: noStore });
  }
}
