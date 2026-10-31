import { describe, expect, it } from "vitest";
import { SUPPORTED_COUNTRIES } from "./countries";

describe("supported country catalog", () => {
  it("contains unique ISO alpha-2 codes and names", () => {
    const codes = SUPPORTED_COUNTRIES.map((country) => country.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(SUPPORTED_COUNTRIES.every((country) => /^[A-Z]{2}$/.test(country.code))).toBe(true);
    expect(SUPPORTED_COUNTRIES.every((country) => country.name.trim().length > 1)).toBe(true);
  });

  it("keeps Kenya first and includes common European visitor countries", () => {
    expect(SUPPORTED_COUNTRIES[0]).toEqual({ code: "KE", name: "Kenya" });
    for (const code of [
      "IT",
      "DE",
      "FR",
      "GB",
      "NL",
      "CH",
      "AT",
      "BE",
      "ES",
      "PT",
      "IE",
      "PL",
      "SE",
      "NO",
      "DK",
      "FI",
    ]) {
      expect(SUPPORTED_COUNTRIES.some((country) => country.code === code)).toBe(true);
    }
  });
});
