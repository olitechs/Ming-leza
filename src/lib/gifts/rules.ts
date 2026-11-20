export const GIFT_DIAMOND_PRICE_KES = 1;
export const GIFT_DIAMOND_REDEMPTION_KES = 0.8;
export const GIFT_DIAMOND_REDEMPTION_MINIMUM = 200;
export const GIFT_DIAMOND_MAX_PURCHASE = 10_000;
export const GIFT_DIAMOND_MAX_REDEMPTION = 100_000;

export function getGiftDiamondPurchaseCostKes(diamonds: number) {
  if (!Number.isInteger(diamonds) || diamonds < 1 || diamonds > GIFT_DIAMOND_MAX_PURCHASE)
    return null;
  return diamonds * GIFT_DIAMOND_PRICE_KES;
}

export function getGiftDiamondRedemptionValueKes(diamonds: number) {
  if (
    !Number.isInteger(diamonds) ||
    diamonds < GIFT_DIAMOND_REDEMPTION_MINIMUM ||
    diamonds > GIFT_DIAMOND_MAX_REDEMPTION
  )
    return null;
  return Number((diamonds * GIFT_DIAMOND_REDEMPTION_KES).toFixed(2));
}
