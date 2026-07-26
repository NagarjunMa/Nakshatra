import { describe, expect, it, vi } from "vitest";

const updateSession = vi.hoisted(() => vi.fn().mockResolvedValue(new Response("ok")));
vi.mock("../src/lib/supabase/proxy", () => ({ updateSession }));

import { NextRequest } from "next/server";
import { config, proxy } from "../src/proxy";

describe("proxy entry", () => {
  it("delegates matching requests to the session proxy", async () => {
    const request = new NextRequest("https://app.test/dashboard");
    await expect(proxy(request)).resolves.toBeInstanceOf(Response);
    expect(updateSession).toHaveBeenCalledWith(request);
  });

  it("excludes framework assets from its matcher", () => {
    expect(config.matcher).toEqual(expect.arrayContaining([expect.stringContaining("_next/static")]));
  });
});
