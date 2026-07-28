export interface CountryReference {
  country_code: string;
  name: string;
}

export interface RegionReference {
  region_code: string;
  name: string;
}

export interface CityReference {
  geoname_id: number;
  name: string;
  region_code: string | null;
}

type LocationReference = CountryReference | RegionReference | CityReference;

export async function getLocationReferences<T extends LocationReference>(
  params: URLSearchParams,
  signal?: AbortSignal
): Promise<T[]> {
  try {
    const response = await fetch(
      `/api/reference/locations?${params.toString()}`,
      { signal }
    );
    if (!response.ok) return [];
    const payload = (await response.json().catch(() => null)) as
      | { options?: T[] }
      | null;
    return Array.isArray(payload?.options) ? payload.options : [];
  } catch {
    return [];
  }
}
