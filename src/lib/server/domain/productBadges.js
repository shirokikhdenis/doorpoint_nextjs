/** Коды бейджей на карточке товара (products.badges TEXT[]). */
const PRODUCT_BADGE_DEFINITIONS = {
  hit: { code: "hit", label: "Хит" },
  sale: { code: "sale", label: "Акция" },
};

const ALLOWED_BADGE_CODES = new Set(Object.keys(PRODUCT_BADGE_DEFINITIONS));

const normalizeProductBadges = (raw) => {
  if (!Array.isArray(raw)) return [];
  const out = [];
  const seen = new Set();
  for (const item of raw) {
    const code = String(item || "")
      .trim()
      .toLowerCase();
    if (!ALLOWED_BADGE_CODES.has(code) || seen.has(code)) continue;
    seen.add(code);
    out.push(code);
  }
  return out;
};

const resolveProductBadges = (raw) =>
  normalizeProductBadges(raw).map((code) => ({
    code,
    label: PRODUCT_BADGE_DEFINITIONS[code].label,
  }));

const syncSaleBadge = (badges, isOnSale) => {
  const normalized = normalizeProductBadges(badges).filter((code) => code !== "sale");
  if (isOnSale) normalized.push("sale");
  return normalized;
};

module.exports = {
  PRODUCT_BADGE_DEFINITIONS,
  ALLOWED_BADGE_CODES,
  normalizeProductBadges,
  resolveProductBadges,
  syncSaleBadge,
};
