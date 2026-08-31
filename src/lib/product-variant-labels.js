const attrValue = (attributes, code) => {
  if (!Array.isArray(attributes)) return "";
  const match = attributes.find((item) => String(item?.code || "").trim() === code);
  return String(match?.value ?? "").trim();
};

const manufacturerFromProduct = (product) => {
  const named = String(product?.manufacturerName || product?.manufacturer || "").trim();
  if (named) return named;
  return attrValue(product?.attributes, "manufacturer");
};

/**
 * Цвет и стекло текущей карточки (отдельная строка products).
 * Совпадает с cartColorLabel / cartGlassLabel на клиенте.
 */
const resolveProductVariantLabels = (product) => {
  if (!product) return { color: "", glass: "", manufacturer: "" };
  const id = Number(product.id);
  const fromChip = Array.isArray(product.colorVariants)
    ? product.colorVariants.find((entry) => Number(entry?.id) === id)
    : null;
  const color =
    String(fromChip?.color || "").trim() ||
    attrValue(product.attributes, "color") ||
    String(product.color || "").trim();
  const glass = attrValue(product.attributes, "glass") || String(product.glass || "").trim();
  return {
    color,
    glass,
    manufacturer: manufacturerFromProduct(product),
  };
};

module.exports = {
  attrValue,
  manufacturerFromProduct,
  resolveProductVariantLabels,
};
