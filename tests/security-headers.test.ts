import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

describe("Next.js security headers", () => {
  it("applies browser defenses globally and no-store policy to sensitive routes", async () => {
    expect(nextConfig.poweredByHeader).toBe(false);
    const rules = await nextConfig.headers?.();
    expect(rules).toBeDefined();
    const global = rules?.find((rule) => rule.source === "/:path*")?.headers ?? [];
    const header = (name: string) => global.find((entry) => entry.key === name)?.value;

    expect(header("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    expect(header("Content-Security-Policy")).toContain("object-src 'none'");
    expect(header("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(header("Permissions-Policy")).toContain("camera=()");
    expect(header("X-Content-Type-Options")).toBe("nosniff");
    expect(header("X-Frame-Options")).toBe("DENY");

    for (const source of [
      "/api/:path*",
      "/dashboard/:path*",
      "/preview/:path*",
      "/approved-preview/:path*",
      "/p/:path*",
    ]) {
      const headers = rules?.find((rule) => rule.source === source)?.headers ?? [];
      expect(headers).toContainEqual({ key: "Cache-Control", value: "private, no-store, max-age=0" });
      expect(headers).toContainEqual({ key: "Vary", value: "Cookie, Authorization" });
    }
  });
});
