const {
  KOROBKA_QTY,
  NALICHNIK_QTY,
} = require("./interiorKitPrice");
const { buildProductPageUrl } = require("./kpPdfCompany");

const TAG_WIDTH_MM = 105;
const TAG_HEIGHT_MM = 148;
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const TAGS_PER_A4_PAGE = 4;
const TAGS_PER_A4_COLS = 2;

const KIT_FOOTNOTE_TEXT = `*В комплект входит полотно, наличники ${NALICHNIK_QTY} шт., коробка ${KOROBKA_QTY} шт.`;
const QR_HINT_TEXT =
  "Отсканируйте QR-код для перехода на страницу этой модели на нашем сайте doorpoint29.ru";

const formatTagPrice = (price) => {
  if (price == null || !Number.isFinite(Number(price))) return "—";
  const numeric = Math.round(Number(price));
  return `${numeric.toLocaleString("ru-RU")} ₽`;
};

const formatTagPriceOrDash = (price) => {
  if (price == null || !Number.isFinite(Number(price))) return "—";
  return formatTagPrice(price);
};

const sanitizeFilenamePart = (value) =>
  String(value || "")
    .trim()
    .replace(/[^\p{L}\p{N}\s_-]+/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "door";

const getAccessorySortRank = (item) => {
  const category = String(item?.category || "").trim().toLowerCase();
  const name = String(item?.name || "").trim().toLowerCase();
  const haystack = `${category} ${name}`;
  if (haystack.includes("наличник")) return 0;
  if (haystack.includes("короб")) return 1;
  if (haystack.includes("добор")) return 2;
  return 3;
};

const sortAccessoriesForTag = (accessories) => {
  if (!Array.isArray(accessories)) return [];
  return [...accessories].sort((a, b) => {
    const rankDiff = getAccessorySortRank(a) - getAccessorySortRank(b);
    if (rankDiff !== 0) return rankDiff;
    return String(a.name || "").localeCompare(String(b.name || ""), "ru", { sensitivity: "base" });
  });
};

const mapAccessoryRow = (item) => ({
  name: formatAccessoryDisplayName(item?.name),
  price: item?.price == null ? null : Math.round(Number(item.price)),
  priceFormatted: formatTagPriceOrDash(item?.price == null ? null : Number(item.price)),
});

const extractAccessoryWidthMm = (name) => {
  const dimensionMatch = name.match(/[хxX×]\s*(\d{2,3})\s*[хxX×]/);
  if (dimensionMatch) return dimensionMatch[1];
  const mmMatch = name.match(/(\d{2,3})\s*мм/i);
  return mmMatch ? mmMatch[1] : null;
};

const formatAccessoryDisplayName = (rawName) => {
  const raw = String(rawName || "").trim();
  if (!raw) return "—";

  const lower = raw.toLowerCase();
  const widthMm = extractAccessoryWidthMm(raw);

  if (widthMm) {
    if (lower.includes("наличник")) return `Наличник ${widthMm} мм`;
    if (lower.includes("короб")) return `Коробка ${widthMm} мм`;
    if (lower.includes("добор")) return `Добор телескоп ${widthMm} мм`;
  }

  const teleMatch = raw.match(/добор\s+телескоп\D*(\d{2,3})/i);
  if (teleMatch) return `Добор телескоп ${teleMatch[1]} мм`;

  return raw.replace(/\s*\/\s*/g, " ").replace(/\s+/g, " ").trim();
};

const buildInteriorPriceTagProductUrl = (row) => {
  const productId = row?.productId == null ? null : Number(row.productId);
  if (!productId || !Number.isFinite(productId) || productId <= 0) return null;

  const productSlug = row?.productSlug == null ? null : String(row.productSlug).trim() || null;
  return buildProductPageUrl(productSlug || String(productId));
};

const buildInteriorPriceTagPayload = (row) => {
  const accessories = sortAccessoriesForTag(row?.accessories).map(mapAccessoryRow);
  const productId = row?.productId == null ? null : Number(row.productId);
  const productSlug = row?.productSlug == null ? null : String(row.productSlug).trim() || null;

  return {
    id: Number(row?.id) || 0,
    productId: productId && Number.isFinite(productId) && productId > 0 ? productId : null,
    productSlug,
    productUrl: buildInteriorPriceTagProductUrl(row),
    productName: String(row?.productName || "").trim() || "—",
    coatingColor: String(row?.coatingColor || "").trim() || "—",
    coatingType: String(row?.coatingType || "").trim(),
    coatingTypeLine: String(row?.coatingType || "").trim()
      ? `Покрытие: ${String(row.coatingType).trim()}`
      : "Покрытие: —",
    manufacturerName: String(row?.manufacturerName || "").trim(),
    manufacturerLine: String(row?.manufacturerName || "").trim()
      ? `Фабрика: ${String(row.manufacturerName).trim()}`
      : "Фабрика: —",
    accessories,
    price: row?.price == null ? null : Math.round(Number(row.price)),
    priceFormatted: formatTagPriceOrDash(row?.price == null ? null : Number(row.price)),
    kitPrice: row?.kitPrice == null ? null : Math.round(Number(row.kitPrice)),
    kitPriceFormatted: formatTagPriceOrDash(row?.kitPrice == null ? null : Number(row.kitPrice)),
    footnote: KIT_FOOTNOTE_TEXT,
  };
};

const buildPriceTagFilename = (row) => {
  const part = sanitizeFilenamePart(row?.productName || row?.productSku || `exhibition-${row?.id}`);
  return `Cennik-${part}.pdf`;
};

const buildBulkPriceTagFilename = (count) => {
  const stamp = new Date().toISOString().slice(0, 10);
  return `Cenniki-vystavka-${count}-${stamp}.pdf`;
};

const mmToPt = (mm) => (Number(mm) * 72) / 25.4;

module.exports = {
  TAG_WIDTH_MM,
  TAG_HEIGHT_MM,
  A4_WIDTH_MM,
  A4_HEIGHT_MM,
  TAGS_PER_A4_PAGE,
  TAGS_PER_A4_COLS,
  KIT_FOOTNOTE_TEXT,
  QR_HINT_TEXT,
  formatTagPrice,
  formatTagPriceOrDash,
  formatAccessoryDisplayName,
  sortAccessoriesForTag,
  buildInteriorPriceTagPayload,
  buildInteriorPriceTagProductUrl,
  buildPriceTagFilename,
  buildBulkPriceTagFilename,
  mmToPt,
};
