"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getLocationReferences,
  type CityReference,
  type CountryReference,
  type RegionReference,
} from "@/features/portfolio/client/location-reference.api";

const FALLBACK_COUNTRIES: CountryReference[] = [
  ["IN", "India"],
  ["US", "United States"],
  ["CA", "Canada"],
  ["GB", "United Kingdom"],
  ["AU", "Australia"],
  ["NZ", "New Zealand"],
  ["AE", "United Arab Emirates"],
  ["SG", "Singapore"],
  ["DE", "Germany"],
  ["NL", "Netherlands"],
  ["IE", "Ireland"],
  ["FR", "France"],
  ["CH", "Switzerland"],
].map(([country_code, name]) => ({ country_code, name }));

export interface LocationValue {
  country?: string;
  countryCode?: string;
  region?: string;
  regionCode?: string;
  city?: string;
  cityGeonameId?: number;
}

export function LocationFields({
  value,
  onChange,
  labels = {
    country: "Country",
    region: "State or region",
    city: "City",
  },
  requireCountryAndCity = false,
}: {
  value: LocationValue;
  onChange: (changes: LocationValue) => void;
  labels?: { country: string; region: string; city: string };
  requireCountryAndCity?: boolean;
}) {
  const [countries, setCountries] = useState<CountryReference[]>(FALLBACK_COUNTRIES);
  const [regionResult, setRegionResult] = useState<{
    countryCode: string;
    options: RegionReference[];
  } | null>(null);
  const [cityResult, setCityResult] = useState<{
    queryKey: string;
    options: CityReference[];
  } | null>(null);

  const countryCode = useMemo(
    () =>
      value.countryCode ||
      countries.find((item) => item.name === value.country)?.country_code ||
      "",
    [countries, value.country, value.countryCode]
  );
  const regions =
    regionResult?.countryCode === countryCode ? regionResult.options : [];
  const regionsLoaded = regionResult?.countryCode === countryCode;
  const regionCode =
    value.regionCode ||
    regions.find((item) => item.name === value.region)?.region_code ||
    "";
  const citySearch = value.city || "";
  const cityQueryKey = [countryCode, regionCode, citySearch.trim()].join("|");
  const cities =
    cityResult?.queryKey === cityQueryKey ? cityResult.options : [];

  useEffect(() => {
    const controller = new AbortController();
    void getLocationReferences<CountryReference>(
      new URLSearchParams({ level: "countries" }),
      controller.signal
    ).then((options) => {
      if (options.length) setCountries(options);
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!countryCode) return;
    const controller = new AbortController();
    void getLocationReferences<RegionReference>(
      new URLSearchParams({ level: "regions", country: countryCode }),
      controller.signal
    ).then((options) => {
      setRegionResult({ countryCode, options });
    });
    return () => controller.abort();
  }, [countryCode]);

  useEffect(() => {
    if (!countryCode || citySearch.trim().length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({
        level: "cities",
        country: countryCode,
        q: citySearch.trim(),
      });
      if (regionCode) params.set("region", regionCode);
      void getLocationReferences<CityReference>(params, controller.signal).then(
        (options) => setCityResult({ queryKey: cityQueryKey, options })
      );
    }, 200);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [citySearch, cityQueryKey, countryCode, regionCode]);

  function selectCountry(nextCode: string) {
    const country = countries.find((item) => item.country_code === nextCode);
    onChange({
      country: country?.name || "",
      countryCode: nextCode || undefined,
      region: "",
      regionCode: undefined,
      city: "",
      cityGeonameId: undefined,
    });
  }

  function selectRegion(nextCode: string) {
    const region = regions.find((item) => item.region_code === nextCode);
    onChange({
      region: region?.name || "",
      regionCode: nextCode || undefined,
      city: "",
      cityGeonameId: undefined,
    });
  }

  function enterCity(city: string) {
    const match = cities.find((item) => item.name === city);
    onChange({
      city,
      cityGeonameId: match?.geoname_id,
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <label className="flex flex-col gap-2 text-[15px] font-semibold text-[color:var(--workspace-ink)]">
        <span className="flex flex-wrap items-center gap-2">{labels.country}<span className="rounded-full border border-[color:var(--workspace-border)] bg-white px-2 py-0.5 text-xs font-semibold text-[color:var(--workspace-ink-muted)]">{requireCountryAndCity ? "Required" : "Optional"}</span></span>
        <span className="text-xs font-medium text-[color:var(--workspace-teal)]">Visible: public introduction</span>
        <select
          aria-label={labels.country}
          name="current_country"
          autoComplete="country-name"
          required={requireCountryAndCity}
          value={countryCode}
          onChange={(event) => selectCountry(event.target.value)}
          className="biodata-field min-h-12"
        >
          <option value="">Select country</option>
          {countries.map((item) => (
            <option key={item.country_code} value={item.country_code}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      {regionsLoaded && regions.length > 0 ? (
        <label className="flex flex-col gap-2 text-[15px] font-semibold text-[color:var(--workspace-ink)]">
          <span className="flex flex-wrap items-center gap-2">{labels.region}<span className="rounded-full border border-[color:var(--workspace-border)] bg-white px-2 py-0.5 text-xs font-semibold text-[color:var(--workspace-ink-muted)]">Optional</span></span>
          <span className="text-xs font-medium text-[color:var(--workspace-teal)]">Visible: public introduction</span>
          <select
            aria-label={labels.region}
            name="current_region"
            autoComplete="address-level1"
            value={regionCode}
            onChange={(event) => selectRegion(event.target.value)}
            className="biodata-field min-h-12"
          >
            <option value="">Select state or region</option>
            {regions.map((item) => (
              <option key={item.region_code} value={item.region_code}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <label className="flex flex-col gap-2 text-[15px] font-semibold text-[color:var(--workspace-ink)]">
          <span className="flex flex-wrap items-center gap-2">{labels.region}<span className="rounded-full border border-[color:var(--workspace-border)] bg-white px-2 py-0.5 text-xs font-semibold text-[color:var(--workspace-ink-muted)]">Optional</span></span>
          <span className="text-xs font-medium text-[color:var(--workspace-teal)]">Visible: public introduction</span>
          <input
            aria-label={labels.region}
            name="current_region"
            autoComplete="address-level1"
            value={value.region || ""}
            disabled={!countryCode}
            placeholder={countryCode ? "Enter state or region" : "Select a country first"}
            onChange={(event) =>
              onChange({ region: event.target.value, regionCode: undefined })
            }
            className="biodata-field min-h-12"
          />
        </label>
      )}

      <label className="flex flex-col gap-2 text-[15px] font-semibold text-[color:var(--workspace-ink)]">
        <span className="flex flex-wrap items-center gap-2">{labels.city}<span className="rounded-full border border-[color:var(--workspace-border)] bg-white px-2 py-0.5 text-xs font-semibold text-[color:var(--workspace-ink-muted)]">{requireCountryAndCity ? "Required" : "Optional"}</span></span>
        <span className="text-xs font-medium text-[color:var(--workspace-teal)]">Visible: public introduction</span>
        <input
          aria-label={labels.city}
          name="current_city"
          autoComplete="address-level2"
          required={requireCountryAndCity}
          list={`cities-${labels.city.replaceAll(" ", "-").toLowerCase()}`}
          value={citySearch}
          disabled={!countryCode}
          placeholder={countryCode ? "Type at least 2 letters" : "Select a country first"}
          onChange={(event) => enterCity(event.target.value)}
          className="biodata-field min-h-12"
        />
        <datalist id={`cities-${labels.city.replaceAll(" ", "-").toLowerCase()}`}>
          {cities.map((item) => (
            <option key={item.geoname_id} value={item.name} />
          ))}
        </datalist>
      </label>
    </div>
  );
}
