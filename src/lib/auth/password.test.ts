import { describe, expect, it } from "vitest";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { isAtLeast18 } from "./age";
import { ageBrackets, signupInput, signInInput } from "./password";

const validSignup = {
  fullName: "Jane Doe",
  email: "jane@example.com",
  password: "123456",
  confirmPassword: "123456",
  phoneE164: "+254712345678",
  countryCode: "KE",
  ageBracket: "25-34",
  eligibilityToken: "signed-eligibility-token-long-enough",
};

describe("password authentication input contracts", () => {
  it("accepts a six-character password and normalizes email and country", () => {
    const parsed = signupInput.parse(validSignup);
    expect(parsed.password).toBe("123456");
    expect(
      signupInput.parse({ ...validSignup, email: " Jane@Example.com ", countryCode: "ke" }),
    ).toMatchObject({
      email: "Jane@Example.com",
      countryCode: "KE",
    });
  });

  it("requires all registration details, a valid email, and at least six password characters", () => {
    expect(signupInput.safeParse({ ...validSignup, fullName: "" }).success).toBe(false);
    expect(signupInput.safeParse({ ...validSignup, email: "not-email" }).success).toBe(false);
    expect(signupInput.safeParse({ ...validSignup, password: "12345" }).success).toBe(false);
    expect(signupInput.safeParse({ ...validSignup, confirmPassword: "654321" }).success).toBe(
      false,
    );
    expect(signupInput.safeParse({ ...validSignup, phoneE164: "712345678" }).success).toBe(false);
    expect(signupInput.safeParse({ ...validSignup, eligibilityToken: "" }).success).toBe(false);
  });

  it("offers the requested age options but excludes minors from account creation", () => {
    expect(ageBrackets).toEqual([
      "under-13",
      "13-17",
      "18-24",
      "25-34",
      "35-44",
      "45-54",
      "55-64",
      "65-plus",
    ]);
    expect(signupInput.safeParse({ ...validSignup, ageBracket: "under-13" }).success).toBe(false);
    expect(signupInput.safeParse({ ...validSignup, ageBracket: "13-17" }).success).toBe(false);
  });

  it("validates international E.164 phone numbers and selected country match", () => {
    const phone = parsePhoneNumberFromString(validSignup.phoneE164);
    expect(phone?.isValid()).toBe(true);
    expect(phone?.country).toBe("KE");
    expect(parsePhoneNumberFromString("+254123")?.isValid()).toBe(false);
  });

  it("accepts standard email/password sign-in credentials only", () => {
    expect(signInInput.safeParse({ email: "member@example.com", password: "secret" }).success).toBe(
      true,
    );
    expect(signInInput.safeParse({ email: "bad-email", password: "secret" }).success).toBe(false);
  });
});

describe("existing adults-only age check", () => {
  it("verifies adult eligibility without persisting a birth date", () => {
    expect(isAtLeast18("2000-10-26", new Date("2026-10-26T00:00:00Z"))).toBe(true);
    expect(isAtLeast18("2015-10-26", new Date("2026-10-26T00:00:00Z"))).toBe(false);
  });
});
