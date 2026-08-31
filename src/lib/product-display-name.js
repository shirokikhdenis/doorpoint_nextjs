const INTERIOR_DOORS_CATEGORY_SLUG = "interior-doors";
const BRAVO_MANUFACTURER = "браво";

const appendToken = (result, token) => {
  const value = String(token || "").trim();
  if (!value) return result;

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
  let result = String(name || "").trim() || "—";
  result = appendToken(result, color);
  if (isBravoInteriorDoor({ manufacturer, categorySlug, category })) {
    result = appendToken(result, glass);
  }
  return result;
};

module.exports = {
  INTERIOR_DOORS_CATEGORY_SLUG,
  appendToken,
  isBravoInteriorDoor,
  formatProductDisplayName,
};
