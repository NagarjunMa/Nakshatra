import { describe, expect, it } from "vitest";
import {
  deriveCustomerInvitationToken,
  hashCustomerInvitationToken,
  isCustomerInvitationToken,
} from "@/features/broker-relationships/server/customer-invitation.token";
import {
  clearCustomerInvitationExchangeCookie,
  createCustomerInvitationExchangeCookie,
  readCustomerInvitationExchangeCookie,
} from "@/features/broker-relationships/server/customer-invitation.cookie";
import {
  claimedCustomerInvitationSchema,
  createCustomerInvitationCommandSchema,
} from "@/features/broker-relationships/server/customer-invitation.contract";

describe("BrokerDesk customer invitation credentials", () => {
  it("separates a stable customer capability from team invitation tokens", () => {
    const input = {
      actorUserId: "11111111-1111-4111-8111-111111111111",
      workspaceRef: `wrk_${"a".repeat(32)}`,
      email: " Customer@Example.com ",
      idempotencyKey: "customer-invite:11111111-1111-4111-8111-111111111111",
    };
    const token = deriveCustomerInvitationToken(input);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(deriveCustomerInvitationToken({ ...input, email: "customer@example.com" })).toBe(token);
    expect(deriveCustomerInvitationToken({ ...input, idempotencyKey: `${input.idempotencyKey}:new` })).not.toBe(token);
    expect(hashCustomerInvitationToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(isCustomerInvitationToken("short")).toBe(false);
    expect(() => hashCustomerInvitationToken("short")).toThrow("BROKERDESK_CUSTOMER_INVITATION_TOKEN_INVALID");
  });

  it("uses a signed, exact-path, thirty-minute HttpOnly cookie", () => {
    const token = "a".repeat(43);
    const cookie = createCustomerInvitationExchangeCookie(token);
    expect(cookie).toMatchObject({
      httpOnly: true,
      path: "/api/v1/customer/broker-invitations/claim",
      maxAge: 1800,
      sameSite: "lax",
    });
    expect(readCustomerInvitationExchangeCookie(cookie.value)).toBe(token);
    expect(readCustomerInvitationExchangeCookie(`${cookie.value}x`)).toBeNull();
    expect(readCustomerInvitationExchangeCookie(undefined)).toBeNull();
    expect(clearCustomerInvitationExchangeCookie()).toMatchObject({ value: "", maxAge: 0 });
  });

  it("rejects caller-expanded commands and internal claim fields", () => {
    expect(createCustomerInvitationCommandSchema.safeParse({
      email: "customer@example.com",
      idempotencyKey: "customer-invite:1111111111111111",
      candidateId: "internal",
    }).success).toBe(false);
    expect(claimedCustomerInvitationSchema.safeParse({ available: true, organizationId: "internal" }).success).toBe(false);
  });
});

