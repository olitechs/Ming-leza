import { describe, expect, it } from "vitest";
import {
  getGiftDiamondPurchaseCostKes,
  getGiftDiamondRedemptionValueKes,
  GIFT_DIAMOND_REDEMPTION_MINIMUM,
} from "./rules";

describe("gift diamond rules", () => {
  it("prices each purchasable diamond at exactly KES 1", () => {
    expect(getGiftDiamondPurchaseCostKes(1)).toBe(1);
    expect(getGiftDiamondPurchaseCostKes(200)).toBe(200);
    expect(getGiftDiamondPurchaseCostKes(10_000)).toBe(10_000);
    expect(getGiftDiamondPurchaseCostKes(0)).toBeNull();
    expect(getGiftDiamondPurchaseCostKes(1.5)).toBeNull();
    expect(getGiftDiamondPurchaseCostKes(10_001)).toBeNull();
  });

  it("values redemptions at KES 0.80 per diamond with a 200-diamond minimum", () => {
    expect(GIFT_DIAMOND_REDEMPTION_MINIMUM).toBe(200);
    expect(getGiftDiamondRedemptionValueKes(200)).toBe(160);
    expect(getGiftDiamondRedemptionValueKes(201)).toBe(160.8);
    expect(getGiftDiamondRedemptionValueKes(1_000)).toBe(800);
    expect(getGiftDiamondRedemptionValueKes(199)).toBeNull();
    expect(getGiftDiamondRedemptionValueKes(200.5)).toBeNull();
    expect(getGiftDiamondRedemptionValueKes(100_001)).toBeNull();
  });
});
