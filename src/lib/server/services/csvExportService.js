const attributeRepository = require("../repositories/attributeRepository");
const productRepository = require("../repositories/productRepository");
const { buildCsvContent } = require("../domain/csvFormat");

const BASE_HEADERS = ["sku", "name", "category", "price", "imageUrl", "model_key"];
const FULL_EXTRA_HEADERS = [
  "id",
  "slug",
  "is_active",
  "is_on_sale",
  "compare_at_price",
  "badges",
  "display_order",
];
const VARIANT_OVERRIDE_HEADERS = ["variantSku", "variantPrice", "variantImageUrl"];

const formatCategoryForExport = (rootName, subcategoryName) => {
  const root = String(rootName || "").trim();
  const sub = String(subcategoryName || "").trim();
  if (!root) return "";
  if (!sub) return root;
  return `${root}>>>${sub}`;
};

const serializeAttrValue = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "Да" : "Нет";
  return String(value);
};

const buildAttributeHeaders = (attributeDefs, mode) => {
  const productAttrs = attributeDefs.filter((def) => def.scope !== "variant");
  const variantAttrs = attributeDefs.filter((def) => def.scope === "variant");
  const headers = [...BASE_HEADERS];
  if (mode === "full") {
    headers.push(...FULL_EXTRA_HEADERS);
  }
  productAttrs.forEach((def) => headers.push(`attr:${def.code}`));
  variantAttrs.forEach((def) => headers.push(`variant_attr:${def.code}`));
  headers.push(...VARIANT_OVERRIDE_HEADERS);
  return headers;
};

const emptyRow = (headers) => Object.fromEntries(headers.map((header) => [header, ""]));

const fillProductBaseFields = (row, product, headers, { includeBaseFields }) => {
  if (!includeBaseFields) return row;

  row.sku = product.sku || "";
  row.name = product.name || "";
  row.category = formatCategoryForExport(product.category, product.subcategory);
  row.price = product.price !== undefined && product.price !== null ? String(product.price) : "";
  row.imageUrl = Array.isArray(product.imageUrls) ? product.imageUrls.filter(Boolean).join(" ") : "";
  row.model_key = product.modelKey || "";

  if (headers.includes("id")) row.id = String(product.id ?? "");
  if (headers.includes("slug")) row.slug = product.slug || "";
  if (headers.includes("is_active")) row.is_active = product.isActive === false ? "0" : "1";
  if (headers.includes("is_on_sale")) row.is_on_sale = product.isOnSale ? "1" : "0";
  if (headers.includes("compare_at_price")) {
    row.compare_at_price =
      product.compareAtPrice === null || product.compareAtPrice === undefined
        ? ""
        : String(product.compareAtPrice);
  }
  if (headers.includes("badges")) {
    row.badges = Array.isArray(product.badges) ? product.badges.join(",") : "";
  }
  if (headers.includes("display_order")) {
    row.display_order =
      product.displayOrder === null || product.displayOrder === undefined
        ? ""
        : String(product.displayOrder);
  }

  const attrs = product.attributes || {};
  headers.forEach((header) => {
    if (!header.startsWith("attr:")) return;
    const code = header.slice("attr:".length);
    row[header] = serializeAttrValue(attrs[code]);
  });

  return row;
};

const fillVariantFields = (row, variant, product, headers) => {
  const variantAttrs = variant?.attributes || {};
  headers.forEach((header) => {
    if (!header.startsWith("variant_attr:")) return;
    const code = header.slice("variant_attr:".length);
    row[header] = serializeAttrValue(variantAttrs[code]);
  });

  if (!variant) return row;

  const productSku = String(product.sku || "").trim();
  const variantSku = String(variant.sku || "").trim();
  if (headers.includes("variantSku") && variantSku && variantSku !== productSku) {
    row.variantSku = variantSku;
  }
  if (
    headers.includes("variantPrice") &&
    variant.price !== null &&
    variant.price !== undefined &&
    Number(variant.price) !== Number(product.price)
  ) {
    row.variantPrice = String(variant.price);
  }
  if (headers.includes("variantImageUrl") && variant.imageUrl) {
    row.variantImageUrl = String(variant.imageUrl);
  }

  return row;
};

const buildImportRows = (products, attributeDefs, mode = "import") => {
  const headers = buildAttributeHeaders(attributeDefs, mode);
  const rows = [];

  for (const product of products) {
    const variants = Array.isArray(product.variants) ? product.variants : [];
    if (variants.length === 0) {
      const row = emptyRow(headers);
      fillProductBaseFields(row, product, headers, { includeBaseFields: true });
      fillVariantFields(row, null, product, headers);
      rows.push(row);
      continue;
    }

    variants.forEach((variant, index) => {
      const row = emptyRow(headers);
      fillProductBaseFields(row, product, headers, { includeBaseFields: index === 0 });
      fillVariantFields(row, variant, product, headers);
      row.sku = product.sku || "";
      rows.push(row);
    });
  }

  return { headers, rows };
};

const renderCsv = (headers, rows) => buildCsvContent(headers, rows);

const parseExportQuery = (query) => {
  const idsRaw = String(query.ids || "").trim();
  const ids = idsRaw
    ? idsRaw
        .split(",")
        .map((value) => Number(value.trim()))
        .filter((id) => Number.isInteger(id) && id > 0)
    : null;

  const mode = String(query.mode || "import").trim() === "full" ? "full" : "import";

  return {
    mode,
    ids: ids && ids.length > 0 ? ids : null,
    search: String(query.search || ""),
    categoryId: query.categoryId ? Number(query.categoryId) : null,
    subcategoryId: query.subcategoryId ? Number(query.subcategoryId) : null,
    manufacturer: query.manufacturer ? String(query.manufacturer).trim() : null,
    hit: query.hit === "1" ? true : query.hit === "0" ? false : null,
    onSale: query.onSale === "1" ? true : query.onSale === "0" ? false : null,
    attributeFilters: Object.fromEntries(
      Object.entries(query)
        .filter(([key, value]) => key.startsWith("attr_") && String(value || "").trim())
        .map(([key, value]) => [key.replace(/^attr_/, ""), String(value)]),
    ),
  };
};

const exportProductsCsv = async (query) => {
  const filters = parseExportQuery(query);
  const [attributeDefs, products] = await Promise.all([
    attributeRepository.listAttributes(),
    productRepository.listProductsForExport(filters),
  ]);

  const { headers, rows } = buildImportRows(products, attributeDefs, filters.mode);
  const csv = renderCsv(headers, rows);
  const date = new Date().toISOString().slice(0, 10);
  const filename = `catalog-${filters.mode}-${date}.csv`;

  return { csv, filename, rowCount: rows.length, productCount: products.length };
};

module.exports = {
  formatCategoryForExport,
  serializeAttrValue,
  buildAttributeHeaders,
  buildImportRows,
  renderCsv,
  parseExportQuery,
  exportProductsCsv,
};
