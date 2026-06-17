export type DiscountKind = "none" | "percent" | "amount";

type PricedItem = {
  price: number;
  quantity: number;
};

export const computeLeadTotals = (
  items: PricedItem[],
  discountKind: DiscountKind = "none",
  discountValue = 0,
) => {
  const subtotal = items.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
    0,
  );

  const kind: DiscountKind =
    discountKind === "percent" || discountKind === "amount" ? discountKind : "none";
  const rawValue = Math.max(0, Math.floor(Number(discountValue) || 0));
  let discountAmount = 0;

  if (kind === "percent") {
    discountAmount = Math.floor((subtotal * Math.min(100, rawValue)) / 100);
  } else if (kind === "amount") {
    discountAmount = Math.min(subtotal, rawValue);
  }

  const total = Math.max(0, subtotal - discountAmount);

  return { subtotal, discountAmount, total };
};
