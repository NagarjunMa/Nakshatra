import { describe, expect, it, vi } from "vitest";
import { ensureOwnerPortfolio } from "../src/features/auth/server/portfolio-bootstrap";

function lookup(result: unknown) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  return { query: { select }, select, eq, maybeSingle };
}

function create(result: unknown) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const select = vi.fn(() => ({ maybeSingle }));
  const upsert = vi.fn(() => ({ select }));
  return { query: { upsert }, upsert, select, maybeSingle };
}

function concurrentLookup(result: unknown) {
  const single = vi.fn().mockResolvedValue(result);
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  return { query: { select }, select, eq, single };
}

describe("owner portfolio bootstrap", () => {
  it("returns an existing owner portfolio without writing", async () => {
    const existing = lookup({ data: { id: "portfolio-existing" }, error: null });
    const from = vi.fn().mockReturnValueOnce(existing.query);
    await expect(ensureOwnerPortfolio({ from } as never, "owner")).resolves.toBe("portfolio-existing");
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("creates the initial private draft with a conflict-safe upsert", async () => {
    const missing = lookup({ data: null, error: null });
    const inserted = create({ data: { id: "portfolio-created" }, error: null });
    const from = vi.fn()
      .mockReturnValueOnce(missing.query)
      .mockReturnValueOnce(inserted.query);

    await expect(ensureOwnerPortfolio({ from } as never, "owner")).resolves.toBe("portfolio-created");
    expect(inserted.upsert).toHaveBeenCalledWith(
      {
        user_id: "owner",
        draft_data: { personal: { name: "", dob: "", gender: "male" } },
      },
      { onConflict: "user_id", ignoreDuplicates: true }
    );
  });

  it("reads back the winning row when simultaneous first logins race", async () => {
    const missing = lookup({ data: null, error: null });
    const conflictedInsert = create({ data: null, error: null });
    const winner = concurrentLookup({ data: { id: "portfolio-winner" }, error: null });
    const from = vi.fn()
      .mockReturnValueOnce(missing.query)
      .mockReturnValueOnce(conflictedInsert.query)
      .mockReturnValueOnce(winner.query);

    await expect(ensureOwnerPortfolio({ from } as never, "owner")).resolves.toBe("portfolio-winner");
    expect(winner.eq).toHaveBeenCalledWith("user_id", "owner");
  });

  it("fails instead of hiding database errors", async () => {
    const failure = new Error("database unavailable");
    const existing = lookup({ data: null, error: failure });
    const from = vi.fn().mockReturnValueOnce(existing.query);
    await expect(ensureOwnerPortfolio({ from } as never, "owner")).rejects.toBe(failure);
  });
});
