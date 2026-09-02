import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod/v4";

const webhookConfigSchema = z.object({
  DIDIT_APPLICATION_ID: z.uuid("DIDIT_APPLICATION_ID must be a UUID"),
  DIDIT_ENVIRONMENT: z.enum(["sandbox", "live"]),
  DIDIT_WEBHOOK_SECRET: z.string().min(16, "DIDIT_WEBHOOK_SECRET is required"),
  DIDIT_WORKFLOW_ID: z.uuid("DIDIT_WORKFLOW_ID must be a UUID"),
});

const diditWebhookEnvelopeSchema = z.object({
  application_id: z.uuid(),
  environment: z.enum(["sandbox", "live"]),
  event_id: z.uuid(),
  session_id: z.uuid(),
  status: z.string().trim().min(1).max(64),
  timestamp: z.number().int().nonnegative(),
  vendor_data: z.string().trim().min(1).max(256),
  webhook_type: z.enum(["status.updated", "data.updated"]),
  workflow_id: z.uuid(),
}).passthrough();

const vendorDataPattern = /^iv:([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}):([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;
const vendorDataSchema = z.string().regex(vendorDataPattern);

const timestampHeaderSchema = z.string().regex(/^\d{10}$/);

export class DiditWebhookError extends Error {
  constructor(readonly code: "DIDIT_WEBHOOK_UNAUTHORIZED" | "DIDIT_WEBHOOK_INVALID") {
    super(code);
  }
}

export type VerifiedDiditWebhook = {
  attemptId: string;
  eventHash: string;
  payloadDigest: string;
  providerSubjectRef: string;
  providerSessionRef: string;
};

function getWebhookConfig() {
  const parsed = webhookConfigSchema.safeParse({
    DIDIT_APPLICATION_ID: process.env.DIDIT_APPLICATION_ID,
    DIDIT_ENVIRONMENT: process.env.DIDIT_ENVIRONMENT,
    DIDIT_WEBHOOK_SECRET: process.env.DIDIT_WEBHOOK_SECRET,
    DIDIT_WORKFLOW_ID: process.env.DIDIT_WORKFLOW_ID,
  });
  if (!parsed.success) throw new DiditWebhookError("DIDIT_WEBHOOK_UNAUTHORIZED");
  return parsed.data;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.keys(record).sort().reduce<Record<string, unknown>>((result, key) => {
      result[key] = canonicalize(record[key]);
      return result;
    }, Object.create(null));
  }
  return value;
}

function isCurrentTimestamp(value: string, now: Date) {
  if (!timestampHeaderSchema.safeParse(value).success) return false;
  const timestamp = Number(value);
  return Number.isSafeInteger(timestamp) && Math.abs(Math.floor(now.getTime() / 1000) - timestamp) <= 300;
}

function validSignature(expected: string, supplied: string | null) {
  if (!supplied || !/^[a-f0-9]{64}$/i.test(supplied)) return false;
  const expectedBytes = Buffer.from(expected, "utf8");
  const suppliedBytes = Buffer.from(supplied, "utf8");
  return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes);
}

/** Verifies a signed Didit V3 envelope without persisting or returning the decision body. */
export function verifyDiditWebhook(input: {
  rawBody: string;
  signature: string | null;
  timestamp: string | null;
  now?: Date;
}): VerifiedDiditWebhook {
  const config = getWebhookConfig();
  const now = input.now ?? new Date();
  if (!input.timestamp || !isCurrentTimestamp(input.timestamp, now)) {
    throw new DiditWebhookError("DIDIT_WEBHOOK_UNAUTHORIZED");
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(input.rawBody);
  } catch {
    throw new DiditWebhookError("DIDIT_WEBHOOK_INVALID");
  }

  const canonical = JSON.stringify(canonicalize(decoded));
  const expectedSignature = createHmac("sha256", config.DIDIT_WEBHOOK_SECRET).update(canonical, "utf8").digest("hex");
  if (!validSignature(expectedSignature, input.signature)) {
    throw new DiditWebhookError("DIDIT_WEBHOOK_UNAUTHORIZED");
  }

  const envelope = diditWebhookEnvelopeSchema.safeParse(decoded);
  if (!envelope.success) throw new DiditWebhookError("DIDIT_WEBHOOK_INVALID");
  if (
    !isCurrentTimestamp(String(envelope.data.timestamp), now)
    || envelope.data.application_id !== config.DIDIT_APPLICATION_ID
    || envelope.data.environment !== config.DIDIT_ENVIRONMENT
    || envelope.data.workflow_id !== config.DIDIT_WORKFLOW_ID
  ) {
    throw new DiditWebhookError("DIDIT_WEBHOOK_UNAUTHORIZED");
  }

  const vendorData = vendorDataSchema.safeParse(envelope.data.vendor_data);
  if (!vendorData.success) throw new DiditWebhookError("DIDIT_WEBHOOK_INVALID");
  const [, providerSubjectRef, attemptId] = vendorData.data.match(vendorDataPattern)!;
  if (!providerSubjectRef || !attemptId) throw new DiditWebhookError("DIDIT_WEBHOOK_INVALID");

  return {
    attemptId,
    eventHash: createHash("sha256").update(envelope.data.event_id, "utf8").digest("hex"),
    payloadDigest: createHash("sha256").update(input.rawBody, "utf8").digest("hex"),
    providerSubjectRef,
    providerSessionRef: envelope.data.session_id,
  };
}
