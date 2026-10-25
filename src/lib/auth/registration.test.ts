import { describe, expect, it } from "vitest";
import { registrationPhoneSchema } from "./registration";

describe("registration phone validation", () => {
  it.each([
    "+254 712 345 678",
    "+39 333 123 4567",
    "+44 (0)20 7946 0958",
    "0712345678",
  ])("accepts a formatted phone number: %s", (phone) => {
    expect(registrationPhoneSchema.safeParse(phone).success).toBe(true);
  });

  it.each(["", "abcdefghi", "          ", "+254 12", "+1234567890123456", "07123abc45"])(
    "rejects an invalid phone number: %s",
    (phone) => {
      expect(registrationPhoneSchema.safeParse(phone).success).toBe(false);
    },
  );
});
