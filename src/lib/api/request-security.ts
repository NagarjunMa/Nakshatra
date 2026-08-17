import { NextResponse } from "next/server";

export const JSON_BODY_LIMIT = 256 * 1024;
export const AUTH_BODY_LIMIT = 8 * 1024;

export class RequestSecurityError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number
  ) {
    super(message);
  }
}

/** Rejects cookie-authenticated mutations that did not originate from this exact application origin. */
export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  const requestUrl = new URL(request.url);
  const expectedOrigins = new Set([requestUrl.origin]);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host");
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (host) {
    try {
      expectedOrigins.add(new URL(`${forwardedProtocol || requestUrl.protocol.replace(":", "")}://${host}`).origin);
    } catch {
      // A malformed proxy host is not added to the allowlist.
    }
  }

  let suppliedOrigin: string | null = null;
  try {
    suppliedOrigin = origin ? new URL(origin).origin : null;
  } catch {
    suppliedOrigin = null;
  }

  if (!suppliedOrigin || !expectedOrigins.has(suppliedOrigin) || (fetchSite && fetchSite !== "same-origin")) {
    throw new RequestSecurityError(
      "This request must come from the Nakshatra application.",
      "CROSS_SITE_REQUEST_BLOCKED",
      403
    );
  }
}

/** Reads at most maxBytes from a request stream and cancels oversized bodies before parsing. */
export async function readLimitedBody(request: Request, maxBytes: number) {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength) {
    const parsedLength = Number(declaredLength);
    if (!Number.isFinite(parsedLength) || parsedLength < 0 || parsedLength > maxBytes) {
      throw new RequestSecurityError("The request is too large.", "REQUEST_TOO_LARGE", 413);
    }
  }

  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new RequestSecurityError("The request is too large.", "REQUEST_TOO_LARGE", 413);
    }
    chunks.push(value);
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

/** Parses a bounded JSON request and returns null for malformed JSON. */
export async function readJsonBody(request: Request, maxBytes = JSON_BODY_LIMIT) {
  const bytes = await readLimitedBody(request, maxBytes);
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    return null;
  }
}

/** Parses bounded multipart data by reconstructing a consumed request from the verified byte buffer. */
export async function readFormDataBody(request: Request, maxBytes: number) {
  const bytes = await readLimitedBody(request, maxBytes);
  try {
    return await new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body: bytes,
    }).formData();
  } catch {
    throw new RequestSecurityError("The submitted form is invalid.", "FORM_DATA_INVALID", 400);
  }
}

export function requestSecurityErrorResponse(error: unknown) {
  const securityError = error instanceof RequestSecurityError ? error : null;
  return NextResponse.json(
    {
      code: securityError?.code || "REQUEST_SECURITY_FAILED",
      error: securityError?.message || "The request could not be validated.",
    },
    { status: securityError?.status || 400 }
  );
}
