export type DoorOfWeekContext = {
  isActive: boolean;
  discountPercent: number;
};

export const applyDoorOfWeekPricing = (
  basePrice: number,
  doorOfWeek?: DoorOfWeekContext | null,
) => {
  if (!doorOfWeek?.isActive || !doorOfWeek.discountPercent) {
    return {
      price: basePrice,
      compareAtPrice: null as number | null,
      isOnSale: false,
    };
  }
  const pct = Math.min(90, Math.max(1, Math.round(doorOfWeek.discountPercent)));
  const compareAtPrice = Math.max(0, Math.floor(basePrice));
  const price = Math.round((compareAtPrice * (100 - pct)) / 100);
  return {
    price,
    compareAtPrice,
    isOnSale: compareAtPrice > price,
  };
};
