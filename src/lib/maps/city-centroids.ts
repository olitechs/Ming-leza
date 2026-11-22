export type CityCentroidRecord = readonly [
  name: string,
  asciiName: string,
  countryCode: string,
  region: string,
  latitude: number,
  longitude: number,
  population: number,
];

export type CityCluster = {
  city: string;
  region: string | null;
  country_code: string;
  online_count: number;
};

export type CityCoordinate = {
  latitude: number;
  longitude: number;
};

function isCityCentroidRecord(value: unknown): value is CityCentroidRecord {
  return (
    Array.isArray(value) &&
    value.length === 7 &&
    typeof value[0] === "string" &&
    typeof value[1] === "string" &&
    typeof value[2] === "string" &&
    typeof value[3] === "string" &&
    typeof value[4] === "number" &&
    Number.isFinite(value[4]) &&
    typeof value[5] === "number" &&
    Number.isFinite(value[5]) &&
    typeof value[6] === "number" &&
    Number.isFinite(value[6])
  );
}

export function parseCityCentroids(payload: unknown): CityCentroidRecord[] {
  if (!payload || typeof payload !== "object" || !("cities" in payload)) return [];
  const cities = payload.cities;
  if (!Array.isArray(cities)) return [];
  return cities.filter(isCityCentroidRecord);
}

function normalizePlaceName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function regionMatches(clusterRegion: string, centroidRegion: string): boolean {
  const clusterKey = normalizePlaceName(clusterRegion);
  const centroidKey = normalizePlaceName(centroidRegion);
  return (
    clusterKey.length > 0 &&
    centroidKey.length > 0 &&
    (clusterKey === centroidKey ||
      clusterKey.startsWith(`${centroidKey} `) ||
      centroidKey.startsWith(`${clusterKey} `))
  );
}

/**
 * Resolves only to a city-centre point from the offline GeoNames gazetteer.
 * Ambiguous same-name cities are omitted unless the profile region disambiguates them.
 */
export function findCityCentroid(
  cluster: CityCluster,
  records: readonly CityCentroidRecord[],
): CityCoordinate | null {
  const cityKey = normalizePlaceName(cluster.city);
  if (!cityKey || !/^[A-Za-z]{2}$/.test(cluster.country_code)) return null;

  const candidates = records.filter(
    (record) =>
      record[2].toUpperCase() === cluster.country_code.toUpperCase() &&
      (normalizePlaceName(record[0]) === cityKey || normalizePlaceName(record[1]) === cityKey),
  );

  let selected: CityCentroidRecord | undefined;
  if (candidates.length === 1) {
    selected = candidates[0];
  } else if (cluster.region?.trim()) {
    const matches = candidates.filter((record) => regionMatches(cluster.region!, record[3]));
    if (matches.length === 1) selected = matches[0];
  }

  if (!selected) return null;
  return { latitude: selected[4], longitude: selected[5] };
}
