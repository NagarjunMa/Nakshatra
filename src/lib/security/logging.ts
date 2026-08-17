const SAFE_REQUEST_ID = /^[A-Za-z0-9_-]{8,80}$/;

/** Returns a correlation identifier without trusting arbitrary log content from request headers. */
export function getRequestId(request: Request) {
  const supplied = request.headers.get("x-request-id");
  return supplied && SAFE_REQUEST_ID.test(supplied) ? supplied : crypto.randomUUID();
}

/** Records a structured error without serializing messages, URLs, tokens, paths, or submitted PII. */
export function logServerError(event: string, requestId: string, error?: unknown) {
  console.error(JSON.stringify({
    level: "error",
    event,
    requestId,
    errorType: error instanceof Error ? error.name : "UnknownError",
  }));
}
