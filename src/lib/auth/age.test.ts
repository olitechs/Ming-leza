import { describe, expect, it } from "vitest";
import { isAtLeast18 } from "./age";

describe("isAtLeast18", () => {
  const now = new Date("2026-10-20T12:00:00.000Z");
  it("accepts a date on the 18th birthday", () => expect(isAtLeast18("2008-10-20", now)).toBe(true));
  it("rejects a date one day short of 18", () => expect(isAtLeast18("2008-10-21", now)).toBe(false));
  it("rejects future dates and impossible calendar dates", () => {
    expect(isAtLeast18("2027-01-01", now)).toBe(false);
    expect(isAtLeast18("2008-02-30", now)).toBe(false);
  });
  it("rejects malformed input", () => expect(isAtLeast18("not-a-date", now)).toBe(false));
});
