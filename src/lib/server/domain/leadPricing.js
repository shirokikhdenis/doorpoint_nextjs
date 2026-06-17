const DISCOUNT_KINDS = ["none", "percent", "amount"];

const normalizeDiscountKind = (value) => {
  const raw = String(value ?? "none").trim();
  return DISCOUNT_KINDS.includes(raw) ? raw : "none";
};

const computeLeadTotals = (items, discountKind = "none", discountValue = 0) => {
  const subtotal = (Array.isArray(items) ? items : []).reduce(
    (sum, item) => sum + (Number(item?.price) || 0) * (Number(item?.quantity) || 0),
    0,
  );

  const kind = normalizeDiscountKind(discountKind);
  const rawValue = Math.max(0, Math.floor(Number(discountValue) || 0));
  let discountAmount = 0;

  if (kind === "percent") {
    const percent = Math.min(100, rawValue);
    discountAmount = Math.floor((subtotal * percent) / 100);
  } else if (kind === "amount") {
    discountAmount = Math.min(subtotal, rawValue);
  }

  const total = Math.max(0, subtotal - discountAmount);

  return {
    subtotal,
    discountAmount,
    total,
    discountKind: kind,
    discountValue: kind === "none" ? 0 : rawValue,
  };
};

module.exports = {
  DISCOUNT_KINDS,
  normalizeDiscountKind,
  computeLeadTotals,
};
