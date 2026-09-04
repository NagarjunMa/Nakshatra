import { beforeEach, describe, expect, it, vi } from "vitest";

const createClient = vi.hoisted(() => vi.fn(() => ({ kind: "service-role" })));

vi.mock("@supabase/supabase-js", () => ({ createClient }));
vi.mock("@/lib/env", () => ({
  env: { NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co" },
}));

import { createServiceRoleClient } from "@/lib/supabase/admin";

describe("Supabase service-role client", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    createClient.mockClear();
  });

  it("fails closed when the server-only service credential is absent", () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(() => createServiceRoleClient()).toThrow();
    expect(createClient).not.toHaveBeenCalled();
  });

  it("creates a non-persistent client from server-only configuration", () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");

    expect(createServiceRoleClient()).toEqual({ kind: "service-role" });
    expect(createClient).toHaveBeenCalledWith(
      "https://project.supabase.co",
      "test-service-role-key",
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  });
});
