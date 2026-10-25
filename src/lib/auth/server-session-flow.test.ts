// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      validator: () => builder,
      handler: (handler: (input: never) => unknown) => handler,
    };
    return builder;
  },
}));

import { sendOtp, verifyOtp } from "./server";

describe("legacy passwordless authentication endpoints", () => {
  it("rejects OTP requests and verification after password-based auth migration", async () => {
    await expect(
      sendOtp({
        data: { method: "email", identifier: "member@example.invalid" },
      }),
    ).resolves.toEqual({
      ok: false,
      message: "Passwordless sign-in is no longer supported. Use your email and password.",
    });

    await expect(
      verifyOtp({
        data: { method: "phone", identifier: "+254712345678", token: "123456" },
      }),
    ).resolves.toEqual({
      ok: false,
      message: "Passwordless sign-in is no longer supported. Use your email and password.",
    });
  });
});
