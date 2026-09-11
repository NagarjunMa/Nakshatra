import { describe, expect, it } from "vitest";
import inventory from "../design/brokerdesk/endpoint-inventory.v1.json";
import { brokerdeskEndpointInventorySchema } from "@/features/security/brokerdesk-endpoint-inventory";

describe("BrokerDesk endpoint inventory", () => {
  it("keeps every planned contract machine-readable and unique", () => {
    const parsed = brokerdeskEndpointInventorySchema.parse(inventory);
    expect(parsed.endpoints).toHaveLength(19);
  });

  it("rejects duplicate route contracts", () => {
    const duplicate = {
      ...inventory,
      endpoints: [...inventory.endpoints, inventory.endpoints[0]],
    };
    expect(brokerdeskEndpointInventorySchema.safeParse(duplicate).success).toBe(false);
  });

  it("rejects undeclared fields that could bypass review", () => {
    const unsafe = {
      ...inventory,
      endpoints: [{ ...inventory.endpoints[0], organizationId: "client-controlled" }],
    };
    expect(brokerdeskEndpointInventorySchema.safeParse(unsafe).success).toBe(false);
  });
});
