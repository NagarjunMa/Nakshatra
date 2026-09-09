import { describe, expect, it } from "vitest";
import {
  brokerCustomerRelationshipRefSchema,
  brokerIntroductionRouteRefSchema,
  customerIntroductionCaseRefSchema,
  importRefSchema,
  invitationRefSchema,
  memberRefSchema,
  taskRefSchema,
  workspaceRefSchema,
} from "@/features/security/public-reference";

const RANDOM_HEX = "0123456789abcdef0123456789abcdef";

describe("BrokerDesk public references", () => {
  it.each([
    [workspaceRefSchema, `wrk_${RANDOM_HEX}`],
    [brokerCustomerRelationshipRefSchema, `bcr_${RANDOM_HEX}`],
    [brokerIntroductionRouteRefSchema, `bir_${RANDOM_HEX}`],
    [customerIntroductionCaseRefSchema, `inc_${RANDOM_HEX}`],
    [taskRefSchema, `tsk_${RANDOM_HEX}`],
    [importRefSchema, `imp_${RANDOM_HEX}`],
    [invitationRefSchema, `inv_${RANDOM_HEX}`],
    [memberRefSchema, `mbr_${RANDOM_HEX}`],
  ])("accepts its own opaque reference type", (schema, value) => {
    expect(schema.parse(value)).toBe(value);
  });

  it("keeps customer case and broker route references non-interchangeable", () => {
    expect(
      customerIntroductionCaseRefSchema.safeParse(`bir_${RANDOM_HEX}`).success
    ).toBe(false);
    expect(
      brokerIntroductionRouteRefSchema.safeParse(`inc_${RANDOM_HEX}`).success
    ).toBe(false);
  });

  it.each([
    "85000000-0000-4000-8000-000000000001",
    "inc_1",
    "inc_0123456789abcdef0123456789abcdeg",
    `INC_${RANDOM_HEX}`,
    `inc_${RANDOM_HEX}00`,
    ` inc_${RANDOM_HEX}`,
  ])("rejects malformed or guessable case references", (value) => {
    expect(customerIntroductionCaseRefSchema.safeParse(value).success).toBe(
      false
    );
  });
});
