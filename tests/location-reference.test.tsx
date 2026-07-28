// @vitest-environment jsdom

import React, { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LocationFields,
  type LocationValue,
} from "../src/components/portfolio/LocationFields";
import { getLocationReferences } from "../src/features/portfolio/client/location-reference.api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("location reference client", () => {
  it("normalizes successful, failed, malformed, and unavailable responses", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ options: [{ country_code: "US", name: "United States" }] }))
      )
      .mockResolvedValueOnce(new Response("no", { status: 503 }))
      .mockResolvedValueOnce(new Response("{", { status: 200 }))
      .mockRejectedValueOnce(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);

    const params = new URLSearchParams({ level: "countries" });
    await expect(getLocationReferences(params)).resolves.toEqual([
      { country_code: "US", name: "United States" },
    ]);
    await expect(getLocationReferences(params)).resolves.toEqual([]);
    await expect(getLocationReferences(params)).resolves.toEqual([]);
    await expect(getLocationReferences(params)).resolves.toEqual([]);
  });

  it("loads dependent options and retains manual entry fallbacks", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("level=countries")) {
        return new Response(
          JSON.stringify({
            options: [
              { country_code: "IN", name: "India" },
              { country_code: "US", name: "United States" },
            ],
          })
        );
      }
      if (url.includes("level=regions")) {
        return new Response(
          JSON.stringify({
            options: [{ region_code: "MA", name: "Massachusetts" }],
          })
        );
      }
      return new Response(
        JSON.stringify({
          options: [
            { geoname_id: 4930956, name: "Boston", region_code: "MA" },
          ],
        })
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    function Harness() {
      const [location, setLocation] = useState<LocationValue>({});
      return (
        <LocationFields
          value={location}
          onChange={(changes) =>
            setLocation((current) => ({ ...current, ...changes }))
          }
        />
      );
    }

    render(<Harness />);
    await waitFor(() =>
      expect(screen.getByLabelText("Country")).toHaveValue("")
    );
    fireEvent.change(screen.getByLabelText("Country"), {
      target: { value: "US" },
    });
    await waitFor(() =>
      expect(screen.getByLabelText("State or region")).toBeInstanceOf(
        HTMLSelectElement
      )
    );
    fireEvent.change(screen.getByLabelText("State or region"), {
      target: { value: "MA" },
    });
    fireEvent.change(screen.getByLabelText("City"), {
      target: { value: "Bo" },
    });
    await waitFor(
      () =>
        expect(
          document.querySelector('datalist option[value="Boston"]')
        ).toBeInTheDocument(),
      { timeout: 1500 }
    );
    fireEvent.change(screen.getByLabelText("City"), {
      target: { value: "Boston" },
    });
    expect(screen.getByLabelText("City")).toHaveValue("Boston");
  });

  it("accepts manual regions when reference data is not populated", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ options: [] }), { status: 200 })
      )
    );
    const onChange = vi.fn();
    render(
      <LocationFields
        value={{ country: "United States", countryCode: "US" }}
        onChange={onChange}
      />
    );
    await waitFor(() =>
      expect(screen.getByLabelText("State or region")).toBeInstanceOf(
        HTMLInputElement
      )
    );
    fireEvent.change(screen.getByLabelText("State or region"), {
      target: { value: "Massachusetts" },
    });
    fireEvent.change(screen.getByLabelText("City"), {
      target: { value: "Boston" },
    });
    expect(onChange).toHaveBeenCalledWith({
      region: "Massachusetts",
      regionCode: undefined,
    });
    expect(onChange).toHaveBeenCalledWith({
      city: "Boston",
      cityGeonameId: undefined,
    });
  });
});
