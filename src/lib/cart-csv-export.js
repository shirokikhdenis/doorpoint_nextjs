const { formatCartItemName } = require("./cart-item-name");

const CSV_DELIMITER = ";";

const escapeCsvCell = (value) => {
  const text = String(value ?? "");
  if (/[",;\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
};

const formatCartLineName = (item) =>
  formatCartItemName(
    item.name,
    item.color,
    item.finishName,
    item.glassOptionName,
    item.hardwareServices,
    item.glass,
  );

const resolveManufacturerId = (item, articleById = new Map()) => {
  const fromItem = String(item?.manufacturerId || "").trim();
  if (fromItem) return fromItem;

  const lookup = articleById.get(Number(item?.id));
  if (lookup?.manufacturerId?.trim()) return lookup.manufacturerId.trim();

  return "";
};

const resolveManufacturerIdFromProduct = (product, variantSku) => {
  const normalizedVariantSku = String(variantSku || "").trim();
  if (normalizedVariantSku && Array.isArray(product?.variants)) {
    const variant = product.variants.find(
      (entry) => String(entry?.sku || "").trim() === normalizedVariantSku,
    );
    const variantArticle = String(variant?.manufacturerId || "").trim();
    if (variantArticle) return variantArticle;
  }

  if (Array.isArray(product?.variants)) {
    for (const variant of product.variants) {
      const article = String(variant?.manufacturerId || "").trim();
      if (article) return article;
    }
  }

  return String(product?.manufacturerId || "").trim();
};

const buildCartCsv = (items, articleById = new Map()) => {
  const header = ["наименование", "артикул производителя", "количество", "цена"];
  const rows = (Array.isArray(items) ? items : []).map((item) =>
    [
      escapeCsvCell(formatCartLineName(item)),
      escapeCsvCell(resolveManufacturerId(item, articleById)),
      String(item.quantity),
      String(Number(item.price) || 0),
    ].join(CSV_DELIMITER),
  );
  return `\uFEFF${[header.join(CSV_DELIMITER), ...rows].join("\r\n")}`;
};

module.exports = {
  buildCartCsv,
  resolveManufacturerIdFromProduct,
};
