import { describe, expect, it } from "vitest";
import {
  isValidFlutterwaveSignature,
  matchesFlutterwaveTransactionReference,
  premiumTiers,
  resolveFlutterwaveBillingMethod,
} from "./server";

describe("Premium plans", () => {
  it("keeps the approved monthly KES price points and card plan configuration names", () => {
    expect(premiumTiers.premium).toEqual({
      label: "Premium",
      amountKes: 200,
      planEnv: "FLW_PLAN_PREMIUM_200",
    });
    expect(premiumTiers.vip).toEqual({
      label: "VIP",
      amountKes: 1000,
      planEnv: "FLW_PLAN_VIP_1000",
    });
  });

  it("accepts only an exact webhook secret hash", () => {
    expect(isValidFlutterwaveSignature("test-secret-hash", "test-secret-hash")).toBe(true);
    expect(isValidFlutterwaveSignature("test-secret-hash", "wrong-secret-hash")).toBe(false);
    expect(isValidFlutterwaveSignature("", "test-secret-hash")).toBe(false);
    expect(isValidFlutterwaveSignature("test-secret-hash", "")).toBe(false);
  });

  it("recognizes only explicit Flutterwave card and M-Pesa payment types", () => {
    expect(resolveFlutterwaveBillingMethod("card")).toBe("card");
    expect(resolveFlutterwaveBillingMethod(" MPeSa ")).toBe("mpesa");
    expect(resolveFlutterwaveBillingMethod("mobilemoney")).toBeNull();
    expect(resolveFlutterwaveBillingMethod("unknown")).toBeNull();
    expect(resolveFlutterwaveBillingMethod(null)).toBeNull();
  });

  it("requires the transaction reference returned by Flutterwave to exactly match the intent", () => {
    expect(matchesFlutterwaveTransactionReference("MZ-exact", "MZ-exact")).toBe(true);
    expect(matchesFlutterwaveTransactionReference("MZ-other", "MZ-exact")).toBe(false);
    expect(matchesFlutterwaveTransactionReference("", "MZ-exact")).toBe(false);
    expect(matchesFlutterwaveTransactionReference(undefined, "MZ-exact")).toBe(false);
  });
});
