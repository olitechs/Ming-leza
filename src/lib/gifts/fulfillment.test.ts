import { describe, expect, it } from "vitest";
import { parseFlutterwaveGiftPaymentBody } from "./fulfillment.server";

const transaction = {
  data: {
    id: 12345,
    status: "successful",
    currency: "KES",
    tx_ref: "MZG-reference",
    amount: 200,
    payment_type: "mpesa",
    customer: { email: "Member@example.com" },
  },
};

describe("Flutterwave gift payment verification", () => {
  it("accepts an exact successful KES payment and normalizes the payer email", () => {
    expect(parseFlutterwaveGiftPaymentBody(transaction, "12345", "MZG-reference")).toEqual({
      transactionId: "12345",
      txRef: "MZG-reference",
      amountKes: 200,
      method: "mpesa",
      customerEmail: "member@example.com",
    });
  });

  it("rejects a mismatched transaction reference, currency or unsuccessful status", () => {
    expect(parseFlutterwaveGiftPaymentBody(transaction, "12345", "MZG-other")).toBeNull();
    expect(
      parseFlutterwaveGiftPaymentBody(
        { data: { ...transaction.data, currency: "USD" } },
        "12345",
        "MZG-reference",
      ),
    ).toBeNull();
    expect(
      parseFlutterwaveGiftPaymentBody(
        { data: { ...transaction.data, status: "pending" } },
        "12345",
        "MZG-reference",
      ),
    ).toBeNull();
  });

  it("rejects unknown methods, fractional amounts and missing payer identity", () => {
    expect(
      parseFlutterwaveGiftPaymentBody(
        { data: { ...transaction.data, payment_type: "banktransfer" } },
        "12345",
        "MZG-reference",
      ),
    ).toBeNull();
    expect(
      parseFlutterwaveGiftPaymentBody(
        { data: { ...transaction.data, amount: 200.5 } },
        "12345",
        "MZG-reference",
      ),
    ).toBeNull();
    expect(
      parseFlutterwaveGiftPaymentBody(
        { data: { ...transaction.data, customer: {} } },
        "12345",
        "MZG-reference",
      ),
    ).toBeNull();
  });

  it("falls back to the supplied provider transaction ID when the response omits one", () => {
    expect(
      parseFlutterwaveGiftPaymentBody(
        { data: { ...transaction.data, id: undefined } },
        "fallback-id",
        "MZG-reference",
      )?.transactionId,
    ).toBe("fallback-id");
  });
});
