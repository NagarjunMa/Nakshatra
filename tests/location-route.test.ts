import { beforeEach, describe, expect, it, vi } from "vitest";

const getApiUser = vi.hoisted(() => vi.fn());
const enforceRateLimit = vi.hoisted(() => vi.fn());
vi.mock("../src/lib/auth", () => ({ getApiUser }));
vi.mock("../src/features/security/server/rate-limit.service", () => ({ enforceRateLimit }));

import { GET } from "../src/app/api/reference/locations/route";

function queryBuilder(result: { data: unknown; error: unknown }) {
  const query: Record<string, ReturnType<typeof vi.fn>> & {
    then?: PromiseLike<unknown>["then"];
  } = {};
  for (const method of ["select", "eq", "ilike", "order", "limit"]) {
    query[method] = vi.fn(() => query);
  }
  query.then = (resolve, reject) =>
    Promise.resolve(result).then(resolve, reject);
  return query;
}

describe("location reference route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enforceRateLimit.mockResolvedValue(null);
  });

  it("requires authentication and validates query combinations", async () => {
    getApiUser.mockResolvedValueOnce({ status: "missing_session" });
    expect(
      (await GET(new Request("http://local/api/reference/locations?level=countries")))
        .status
    ).toBe(401);

    getApiUser.mockResolvedValueOnce({
      status: "authenticated",
      user: { id: "owner" },
      supabase: {},
    });
    expect(
      (await GET(new Request("http://local/api/reference/locations?level=regions")))
        .status
    ).toBe(400);
  });

  it("returns countries, regions, and filtered cities", async () => {
    const countryQuery = queryBuilder({
      data: [{ country_code: "US", name: "United States" }],
      error: null,
    });
    const regionQuery = queryBuilder({
      data: [{ region_code: "MA", name: "Massachusetts" }],
      error: null,
    });
    const cityQuery = queryBuilder({
      data: [{ geoname_id: 4930956, name: "Boston", region_code: "MA" }],
      error: null,
    });
    const from = vi
      .fn()
      .mockReturnValueOnce(countryQuery)
      .mockReturnValueOnce(regionQuery)
      .mockReturnValueOnce(cityQuery);
    getApiUser.mockResolvedValue({
      status: "authenticated",
      user: { id: "owner" },
      supabase: { from },
    });

    const countries = await GET(
      new Request("http://local/api/reference/locations?level=countries")
    );
    expect(await countries.json()).toEqual({
      options: [{ country_code: "US", name: "United States" }],
    });

    const regions = await GET(
      new Request(
        "http://local/api/reference/locations?level=regions&country=us"
      )
    );
    expect(await regions.json()).toEqual({
      options: [{ region_code: "MA", name: "Massachusetts" }],
    });
    expect(regionQuery.eq).toHaveBeenCalledWith("country_code", "US");

    const cities = await GET(
      new Request(
        "http://local/api/reference/locations?level=cities&country=us&region=MA&q=Bo%25_"
      )
    );
    expect(await cities.json()).toEqual({
      options: [
        { geoname_id: 4930956, name: "Boston", region_code: "MA" },
      ],
    });
    expect(cityQuery.eq).toHaveBeenCalledWith("region_code", "MA");
    expect(cityQuery.ilike).toHaveBeenCalledWith("name", "Bo\\%\\_%");
  });

  it("returns an actionable fallback when reference tables are unavailable", async () => {
    const query = queryBuilder({
      data: null,
      error: { message: "relation missing" },
    });
    getApiUser.mockResolvedValue({
      status: "authenticated",
      user: { id: "owner" },
      supabase: { from: vi.fn(() => query) },
    });
    const response = await GET(
      new Request("http://local/api/reference/locations?level=countries")
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      code: "LOCATION_REFERENCE_UNAVAILABLE",
    });
  });
});
