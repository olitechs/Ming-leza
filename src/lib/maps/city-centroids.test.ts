import { describe, expect, it } from "vitest";
import { findCityCentroid, parseCityCentroids, type CityCentroidRecord } from "./city-centroids";

const records: CityCentroidRecord[] = [
  ["Nairobi", "Nairobi", "KE", "Nairobi", -1.2864, 36.8172, 4_400_000],
  ["Springfield", "Springfield", "US", "Illinois", 39.7817, -89.6501, 114_000],
  ["Springfield", "Springfield", "US", "Massachusetts", 42.1015, -72.5898, 155_000],
];

describe("city centroid lookup", () => {
  it("matches normalized city names only within the requested country", () => {
    expect(
      findCityCentroid(
        { city: "Nairobi", region: null, country_code: "KE", online_count: 4 },
        records,
      ),
    ).toEqual({ latitude: -1.2864, longitude: 36.8172 });
    expect(
      findCityCentroid(
        { city: "Nairobi", region: null, country_code: "US", online_count: 4 },
        records,
      ),
    ).toBeNull();
  });

  it("matches a city with accents to its ASCII spelling", () => {
    expect(
      findCityCentroid(
        { city: "Nairobí", region: "Nairobi County", country_code: "KE", online_count: 3 },
        records,
      ),
    ).toEqual({ latitude: -1.2864, longitude: 36.8172 });
  });

  it("uses the profile region to disambiguate cities with the same name", () => {
    expect(
      findCityCentroid(
        { city: "Springfield", region: "Illinois", country_code: "US", online_count: 5 },
        records,
      ),
    ).toEqual({ latitude: 39.7817, longitude: -89.6501 });
  });

  it("does not guess when a same-name city is ambiguous", () => {
    expect(
      findCityCentroid(
        { city: "Springfield", region: null, country_code: "US", online_count: 5 },
        records,
      ),
    ).toBeNull();
  });

  it("rejects malformed coordinate records from the static payload", () => {
    expect(
      parseCityCentroids({
        cities: [records[0], ["Broken", "Broken", "KE", "", "north", 37, 0], null],
      }),
    ).toEqual([records[0]]);
    expect(parseCityCentroids(null)).toEqual([]);
  });
});
