import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AUTH_BODY_LIMIT,
  readFormDataBody,
  readJsonBody,
  readLimitedBody,
  requestSecurityErrorResponse,
  RequestSecurityError,
  requireSameOrigin,
} from "../src/lib/api/request-security";
import { getRequestId, logServerError } from "../src/lib/security/logging";
import { createCanonicalAppUrl, sanitizeInternalRedirect } from "../src/lib/security/redirect";
import {
  consumeRateLimit,
  enforceRateLimit,
  RateLimitServiceError,
  rateLimitActionSchema,
  rateLimitResponse,
} from "../src/features/security/server/rate-limit.service";
import { privateCapabilityTtl } from "../src/features/portfolio/server/public-portfolio.service";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("request boundary security", () => {
  it("allows exact same-origin mutations and blocks missing, malformed, and cross-site origins", () => {
    expect(() => requireSameOrigin(new Request("https://nakshatra.test/api/save", {
      headers: { Origin: "https://nakshatra.test", "Sec-Fetch-Site": "same-origin" },
    }))).not.toThrow();

    for (const headers of [
      new Headers(),
      new Headers({ Origin: "not-a-url" }),
      new Headers({ Origin: "https://attacker.test" }),
      new Headers({ Origin: "https://nakshatra.test", "Sec-Fetch-Site": "cross-site" }),
    ]) {
      expect(() => requireSameOrigin(new Request("https://nakshatra.test/api/save", { headers })))
        .toThrowError(expect.objectContaining({ code: "CROSS_SITE_REQUEST_BLOCKED", status: 403 }));
    }
  });

  it("uses the request origin even when canonical links use another host", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.nakshatra.test/base");
    expect(() => requireSameOrigin(new Request("http://localhost:3000/api/save", {
      headers: { Origin: "http://localhost:3000" },
    }))).not.toThrow();
  });

  it("accepts the browser-visible host when a trusted proxy rewrites the internal request URL", () => {
    expect(() => requireSameOrigin(new Request("http://localhost:3100/api/save", {
      headers: {
        Origin: "https://preview.nakshatra.test",
        Host: "internal:3100",
        "X-Forwarded-Host": "preview.nakshatra.test",
        "X-Forwarded-Proto": "https",
      },
    }))).not.toThrow();
  });

  it("rejects declared and streamed bodies above the configured limit", async () => {
    await expect(readLimitedBody(new Request("http://local", {
      method: "POST",
      headers: { "Content-Length": String(AUTH_BODY_LIMIT + 1) },
      body: "x",
    }), AUTH_BODY_LIMIT)).rejects.toMatchObject({ code: "REQUEST_TOO_LARGE", status: 413 });

    await expect(readLimitedBody(new Request("http://local", {
      method: "POST",
      body: "12345",
    }), 4)).rejects.toMatchObject({ code: "REQUEST_TOO_LARGE" });
  });

  it("parses bounded JSON and multipart bodies without trusting malformed input", async () => {
    await expect(readJsonBody(new Request("http://local", { method: "POST", body: "{bad" }))).resolves.toBeNull();
    await expect(readJsonBody(new Request("http://local", { method: "POST", body: JSON.stringify({ ok: true }) })))
      .resolves.toEqual({ ok: true });

    const source = new FormData();
    source.set("name", "Aditi");
    const parsed = await readFormDataBody(new Request("http://local", { method: "POST", body: source }), 1024);
    expect(parsed.get("name")).toBe("Aditi");

    await expect(readFormDataBody(new Request("http://local", {
      method: "POST",
      headers: { "Content-Type": "multipart/form-data" },
      body: "invalid",
    }), 1024)).rejects.toMatchObject({ code: "FORM_DATA_INVALID" });
  });

  it("returns stable error codes without changing arbitrary errors into internal details", async () => {
    const response = requestSecurityErrorResponse(
      new RequestSecurityError("The request is too large.", "REQUEST_TOO_LARGE", 413)
    );
    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({
      code: "REQUEST_TOO_LARGE",
      error: "The request is too large.",
    });

    const fallback = requestSecurityErrorResponse(new Error("database password"));
    await expect(fallback.json()).resolves.toEqual({
      code: "REQUEST_SECURITY_FAILED",
      error: "The request could not be validated.",
    });
  });
});

describe("redirects and safe logging", () => {
  it.each([
    [undefined, "/dashboard"],
    ["https://attacker.test/steal", "/dashboard"],
    ["//attacker.test/steal", "/dashboard"],
    ["/safe\\redirect", "/dashboard"],
    ["/p/token?view=1#details", "/p/token?view=1#details"],
  ])("sanitizes %s to %s", (candidate, expected) => {
    expect(sanitizeInternalRedirect(candidate)).toBe(expected);
  });

  it("builds canonical URLs from production configuration with a local fallback", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    expect(createCanonicalAppUrl("/dashboard", "http://localhost:3000/callback")).toBe("http://localhost:3000/dashboard");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://nakshatra.example/path");
    expect(createCanonicalAppUrl("/dashboard", "http://localhost:3000/callback")).toBe("https://nakshatra.example/dashboard");
  });

  it("accepts safe request IDs and logs only structured error types", () => {
    const supplied = getRequestId(new Request("http://local", { headers: { "X-Request-Id": "request_12345678" } }));
    expect(supplied).toBe("request_12345678");
    expect(getRequestId(new Request("http://local", { headers: { "X-Request-Id": "unsafe value" } })))
      .toMatch(/^[0-9a-f-]{36}$/);

    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    logServerError("auth.failed", supplied, new Error("token=private-value"));
    const output = String(error.mock.calls[0]?.[0]);
    expect(output).toContain('"errorType":"Error"');
    expect(output).not.toContain("private-value");
  });
});

describe("database-backed rate limits", () => {
  function client(data: unknown, error: unknown = null) {
    return { rpc: vi.fn().mockResolvedValue({ data, error }) };
  }

  it("hashes anonymous network hints before calling the fixed database command", async () => {
    const supabase = client({ allowed: true, retryAfter: 0 });
    const result = await consumeRateLimit(supabase as never, new Request("http://local", {
      headers: { "X-Forwarded-For": "203.0.113.4", "User-Agent": "test-browser" },
    }), "auth_email");
    expect(result).toEqual({ allowed: true, retryAfter: 0 });
    expect(supabase.rpc).toHaveBeenCalledWith("consume_api_rate_limit", {
      p_action: "auth_email",
      p_subject_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
  });

  it("fails closed for malformed persistence responses and unavailable quotas", async () => {
    await expect(consumeRateLimit(client({ allowed: "yes" }) as never, new Request("http://local"), "auth_google"))
      .rejects.toBeInstanceOf(RateLimitServiceError);
    expect((await enforceRateLimit(client(null, new Error("offline")) as never, new Request("http://local"), "auth_google"))?.status)
      .toBe(503);
  });

  it("allows available quota and returns a bounded Retry-After response when exhausted", async () => {
    await expect(enforceRateLimit(client({ allowed: true, retryAfter: 0 }) as never, new Request("http://local"), "location_search"))
      .resolves.toBeNull();
    const denied = await enforceRateLimit(client({ allowed: false, retryAfter: 42 }) as never, new Request("http://local"), "interest_submit");
    expect(denied?.status).toBe(429);
    expect(denied?.headers.get("Retry-After")).toBe("42");
    expect(rateLimitResponse(0).headers.get("Retry-After")).toBe("1");
    expect(rateLimitActionSchema.safeParse("unknown_action").success).toBe(false);
  });
});

describe("grant-bounded capabilities", () => {
  it("caps signed URLs at five minutes and rejects expired grants", () => {
    const now = Date.parse("2026-08-17T00:00:00.000Z");
    expect(privateCapabilityTtl("2026-08-17T00:20:00.000Z", now)).toBe(300);
    expect(privateCapabilityTtl("2026-08-17T00:01:30.000Z", now)).toBe(90);
    expect(privateCapabilityTtl("2026-08-16T23:59:59.000Z", now)).toBeNull();
  });
});
