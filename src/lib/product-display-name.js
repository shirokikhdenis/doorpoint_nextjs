const INTERIOR_DOORS_CATEGORY_SLUG = "interior-doors";
const BRAVO_MANUFACTURER = "браво";
const MEANINGLESS_TOKENS = new Set(["да", "нет", "-", "—", "x", "n/a", "na", "none"]);

const stripTrailingStars = (value) => String(value || "").trim().replace(/\*+\s*$/g, "").trim();

const isMeaningfulToken = (value) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return false;
  return !MEANINGLESS_TOKENS.has(trimmed.toLowerCase());
};

const appendToken = (result, token) => {
  const value = stripTrailingStars(token);
  if (!isMeaningfulToken(value)) return result;

  const resultLower = result.toLowerCase();
  const valueLower = value.toLowerCase();
  if (resultLower === valueLower) return result;
  if (resultLower.endsWith(` ${valueLower}`)) return result;
  if (resultLower.includes(` ${valueLower} `)) return result;

  return result ? `${result} ${value}` : value;
};

const normalizeManufacturerKey = (value) => String(value || "").trim().toLowerCase();

const isInteriorDoorsScope = ({ categorySlug, category } = {}) => {
  const slug = String(categorySlug || "").trim().toLowerCase();
  if (slug === INTERIOR_DOORS_CATEGORY_SLUG) return true;
  const label = String(category || "").trim().toLowerCase();
  return label.includes("межкомнат");
};

/** Межкомнатная дверь фабрики Браво — в название добавляются цвет и стекло. */
const isBravoInteriorDoor = ({ manufacturer, categorySlug, category } = {}) =>
  normalizeManufacturerKey(manufacturer) === BRAVO_MANUFACTURER &&
  isInteriorDoorsScope({ categorySlug, category });

/**
 * Наименование для каталога, корзины и документов.
 * Цвет добавляется всегда; стекло — только у межкомнатных дверей Браво.
 */
const formatProductDisplayName = ({
  name,
  color,
  glass,
  manufacturer,
  categorySlug,
  category,
} = {}) => {
  let result = stripTrailingStars(name) || "—";
  result = appendToken(result, color);
  if (isBravoInteriorDoor({ manufacturer, categorySlug, category })) {
    result = appendToken(result, glass);
  }
  return result;
};

module.exports = {
  INTERIOR_DOORS_CATEGORY_SLUG,
  appendToken,
  stripTrailingStars,
  isMeaningfulToken,
  isBravoInteriorDoor,
  formatProductDisplayName,
};
