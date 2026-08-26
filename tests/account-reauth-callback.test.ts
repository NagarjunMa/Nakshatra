import { beforeEach, describe, expect, it, vi } from "vitest";

const createClient = vi.hoisted(() => vi.fn());
const completeAccountDeletionReauth = vi.hoisted(() => vi.fn());
const logServerError = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/features/account/server/account.service", () => ({ completeAccountDeletionReauth }));
vi.mock("@/lib/security/logging", () => ({ getRequestId: () => "request-id", logServerError }));

import { GET } from "../src/app/api/auth/callback/route";
import { createReauthTransactionCookie } from "../src/features/account/server/reauth-cookie";

describe("account deletion reauthentication callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "owner" } } }),
      },
    });
    completeAccountDeletionReauth.mockResolvedValue("verified");
  });

  it("issues only an HttpOnly deletion-path proof after verified fresh authentication", async () => {
    const transaction = createReauthTransactionCookie("11111111-1111-4111-8111-111111111111");
    const response = await GET(new Request("http://local/api/auth/callback?code=ok&reauth=account_deletion", {
      headers: { Cookie: `${transaction.name}=${transaction.value}` },
    }));
    expect(response.headers.get("location")).toBe("http://local/account?reauth=complete");
    expect(response.headers.get("set-cookie")).toContain("nakshatra_deletion_proof=");
    expect(response.headers.get("set-cookie")).toContain("Path=/api/account/deletion");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(completeAccountDeletionReauth).toHaveBeenCalledWith(
      expect.anything(), "11111111-1111-4111-8111-111111111111", expect.stringMatching(/^[a-f0-9]{64}$/)
    );
  });

  it("preserves ordinary callback behavior when no valid transaction cookie exists", async () => {
    const from = vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: "portfolio" } }) })) })),
    }));
    createClient.mockResolvedValueOnce({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "owner" } } }),
      },
      from,
    });
    const response = await GET(new Request("http://local/api/auth/callback?code=ok&next=/edit"));
    expect(response.headers.get("location")).toBe("http://local/edit");
    expect(completeAccountDeletionReauth).not.toHaveBeenCalled();
  });
});
