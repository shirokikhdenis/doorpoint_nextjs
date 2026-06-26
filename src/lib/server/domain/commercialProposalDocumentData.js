const {
  KP_VALIDITY_DAYS,
  buildProductPageUrl,
} = require("./kpPdfCompany");

const ENTRY_DOORS_CATEGORY_SLUG = "entry-doors";

const KIT_HINT_TEXT =
  "В комплект входит: 2,5 коробки, 5 наличников. Доборы и фурнитура приобретаются отдельно";

const KP_ATTRIBUTE_CODES = ["collection", "manufacturer", "glass", "thickness", "color"];
const KP_EXCLUDED_ATTR_CODES = new Set([
  "pogonazh_id",
  "pogonazh_komplekt",
  "sort_order",
]);

const formatKpPrice = (price) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(Number(price) || 0);

const formatKpDate = (date = new Date()) =>
  date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const formatKpDateShort = (date = new Date()) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${date.getFullYear()}`;
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const findProductAttribute = (product, code) => {
  const attributes = Array.isArray(product?.attributes) ? product.attributes : [];
  return attributes.find((item) => String(item?.code || "") === code) || null;
};

const buildKpDisplayName = (product) => {
  const baseName = String(product?.name || "Товар").trim() || "Товар";
  const colorAttr = findProductAttribute(product, "color");
  const color = String(colorAttr?.value || product?.color || "").trim();
  if (!color) return baseName;
  if (baseName.toLowerCase().includes(color.toLowerCase())) return baseName;
  return `${baseName} (${color})`;
};

const buildKpNumber = (productId, date = new Date()) => {
  const id = Number(productId) || 0;
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
  return `KP-${id}-${stamp}`;
};

const buildKpCategoryLine = (product) => {
  const category = String(product?.category || "").trim();
  const subcategory = String(product?.subcategory || "").trim();
  if (category && subcategory) return `${category} / ${subcategory}`;
  return category || subcategory || "";
};

const buildKpAttributes = (product) => {
  const attributes = Array.isArray(product?.attributes) ? product.attributes : [];
  const byCode = new Map(
    attributes
      .filter((item) => item && !KP_EXCLUDED_ATTR_CODES.has(String(item.code || "")))
      .map((item) => [String(item.code || ""), item]),
  );

  const selected = [];
  for (const code of KP_ATTRIBUTE_CODES) {
    const item = byCode.get(code);
    if (!item) continue;
    const value = String(item.value || "").trim();
    if (!value) continue;
    selected.push({
      code,
      name: String(item.name || code).trim() || code,
      value,
    });
  }

  if (selected.length >= 5) return selected.slice(0, 5);

  for (const item of attributes) {
    const code = String(item?.code || "");
    if (!code || KP_EXCLUDED_ATTR_CODES.has(code)) continue;
    if (selected.some((entry) => entry.code === code)) continue;
    const value = String(item?.value || "").trim();
    if (!value) continue;
    selected.push({
      code,
      name: String(item.name || code).trim() || code,
      value,
    });
    if (selected.length >= 5) break;
  }

  return selected;
};

const sanitizeFilenamePart = (value) =>
  String(value || "")
    .trim()
    .replace(/[^\p{L}\p{N}\s_-]+/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "product";

const buildKpFilename = (product) => {
  const sku = String(product?.sku || "").trim();
  const label = sanitizeFilenamePart(sku || buildKpDisplayName(product));
  return `KP-${label}.pdf`;
};

const resolveProductImageUrl = (product) => {
  const primary = String(product?.image || "").trim();
  if (primary) return primary;
  const images = Array.isArray(product?.images) ? product.images : [];
  const first = images.map((item) => String(item || "").trim()).find(Boolean);
  return first || "";
};

const isEntryDoorProduct = (product) =>
  String(product?.categorySlug || "").trim() === ENTRY_DOORS_CATEGORY_SLUG;

const buildKpPayload = (product, { generatedAt = new Date() } = {}) => {
  const isEntryDoor = isEntryDoorProduct(product);
  const kitPrice = product?.kitPrice;
  const compareAtPrice =
    product?.compareAtPrice === null || product?.compareAtPrice === undefined
      ? null
      : Number(product.compareAtPrice);
  const showCompareAt =
    product?.isOnSale === true &&
    compareAtPrice !== null &&
    Number.isFinite(compareAtPrice) &&
    compareAtPrice > Number(product?.price || 0);

  return {
    kpNumber: buildKpNumber(product?.id, generatedAt),
    isEntryDoor,
    showKitPrice: !isEntryDoor,
    doorPriceLabel: isEntryDoor ? "Цена" : "Цена за полотно",
    showImageFrame: !isEntryDoor,
    displayName: buildKpDisplayName(product),
    sku: String(product?.sku || "").trim(),
    categoryLine: buildKpCategoryLine(product),
    attributes: buildKpAttributes(product),
    doorPriceFormatted: formatKpPrice(product?.price),
    compareAtPriceFormatted: showCompareAt ? formatKpPrice(compareAtPrice) : null,
    kitPriceFormatted:
      kitPrice === null || kitPrice === undefined ? null : formatKpPrice(kitPrice),
    kitAvailable: kitPrice !== null && kitPrice !== undefined,
    kitHintText: KIT_HINT_TEXT,
    imageUrl: resolveProductImageUrl(product),
    productPageUrl: buildProductPageUrl(product?.slug || product?.id),
    productPageLinkLabel: product?.slug
      ? `/product/${String(product.slug).trim()}`
      : buildProductPageUrl(product?.slug || product?.id),
    generatedAtFormatted: formatKpDate(generatedAt),
    validUntilFormatted: formatKpDate(addDays(generatedAt, KP_VALIDITY_DAYS)),
  };
};

module.exports = {
  ENTRY_DOORS_CATEGORY_SLUG,
  KIT_HINT_TEXT,
  formatKpPrice,
  formatKpDate,
  buildKpDisplayName,
  buildKpNumber,
  buildKpFilename,
  buildKpPayload,
  buildKpAttributes,
  isEntryDoorProduct,
  resolveProductImageUrl,
};
