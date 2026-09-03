/** Размеры блоков графических креативов Яндекс Директа (готовые креативы). */

const MAX_PRODUCTS = 15;
const MAX_JPEG_BYTES = 512 * 1024;
const DEFAULT_SCALE = 2;
const ALLOWED_SCALES = [1, 2, 3];
const DESIGN_SCALE = 3;
const DESIGN_MAX_EDGE = 2400;
const DEFAULT_SIZE_IDS = ["240x400", "300x250", "728x90"];
const COMPACT_BLOCK_HEIGHT = 110;
const MAX_CTA_LEN = 24;
const DEFAULT_CTA_TEXT = "Смотреть модель";
const MAX_COLLAGE_PHOTOS = 4;

/**
 * Семейство макета по соотношению сторон блока.
 * Широкие баннеры — отдельно, 16:9 — ландшафт, высокий портрет — плашка снизу, остальное — карточка.
 */
const layoutFamilyForBlock = (blockWidth, blockHeight) => {
  const width = Number(blockWidth) || 0;
  const height = Number(blockHeight) || 0;
  if (width < 1 || height < 1) return "card";
  if (width / height >= 2.2) return "wide";
  if (width / height >= 1.65) return "landscape";
  if (height / width >= 1.4) return "portrait";
  return "card";
};

const SIZE_DEFS = [
  { id: "240x400", blockWidth: 240, blockHeight: 400, popular: true },
  { id: "300x250", blockWidth: 300, blockHeight: 250, popular: true },
  { id: "300x500", blockWidth: 300, blockHeight: 500, popular: false },
  { id: "300x600", blockWidth: 300, blockHeight: 600, popular: false },
  { id: "320x50", blockWidth: 320, blockHeight: 50, popular: false },
  { id: "320x100", blockWidth: 320, blockHeight: 100, popular: false },
  { id: "320x480", blockWidth: 320, blockHeight: 480, popular: false },
  { id: "336x280", blockWidth: 336, blockHeight: 280, popular: false },
  { id: "480x320", blockWidth: 480, blockHeight: 320, popular: false },
  { id: "600x600", blockWidth: 600, blockHeight: 600, popular: false, note: "квадрат" },
  { id: "728x90", blockWidth: 728, blockHeight: 90, popular: true },
  { id: "970x250", blockWidth: 970, blockHeight: 250, popular: false },
  { id: "1600x900", blockWidth: 1600, blockHeight: 900, popular: false, note: "16:9" },
];

const DIRECT_CREATIVE_SIZES = SIZE_DEFS.map((def) => ({
  ...def,
  family: layoutFamilyForBlock(def.blockWidth, def.blockHeight),
  label: `${def.blockWidth} × ${def.blockHeight}`,
}));

const SIZE_BY_ID = new Map(DIRECT_CREATIVE_SIZES.map((size) => [size.id, size]));

const getSizeById = (id) => SIZE_BY_ID.get(String(id || "").trim()) || null;

const resolveScale = (raw) => {
  const value = Number(raw);
  if (ALLOWED_SCALES.includes(value)) return value;
  return null;
};

const resolveLayoutScale = (blockWidth, blockHeight) => {
  const longest = Math.max(Number(blockWidth) || 0, Number(blockHeight) || 0);
  if (longest < 1) return DESIGN_SCALE;
  if (longest <= 1000 || longest * DESIGN_SCALE <= DESIGN_MAX_EDGE) return DESIGN_SCALE;
  return DESIGN_MAX_EDGE / longest;
};

const resolveOutputPixels = (size, scale) => {
  const safeScale = resolveScale(scale);
  if (!size || !safeScale) return null;
  return {
    width: size.blockWidth * safeScale,
    height: size.blockHeight * safeScale,
  };
};

const resolveDesignPixels = (size) => {
  if (!size || !Number.isInteger(size.blockWidth) || !Number.isInteger(size.blockHeight)) {
    return null;
  }
  if (size.blockWidth < 1 || size.blockHeight < 1) return null;
  const layoutScale = resolveLayoutScale(size.blockWidth, size.blockHeight);
  return {
    width: Math.round(size.blockWidth * layoutScale),
    height: Math.round(size.blockHeight * layoutScale),
  };
};

const isCompactBlock = (blockHeight) => Number(blockHeight) < COMPACT_BLOCK_HEIGHT;

const formatCreativeBrandLine = (siteUrl) => {
  const raw = String(siteUrl || "").trim();
  if (!raw) return "";
  let host = "";
  try {
    const withProto = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
    host = new URL(withProto).hostname;
  } catch {
    host = raw.replace(/^https?:\/\//, "").split("/")[0];
  }
  host = host.replace(/^www\./, "").trim();
  if (!host || host === "localhost" || host.endsWith(".local") || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) {
    return "";
  }
  return host;
};

const sanitizeCreativeFileStem = (sku, productId) => {
  const safe = String(sku || "")
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/^[_-]+|[_-]+$/g, "");
  if (safe) return safe;
  const id = Number(productId);
  if (Number.isInteger(id) && id > 0) return `id${id}`;
  return "door";
};

const buildCreativeFilename = ({ sku, productId, width, height } = {}) => {
  const stem = sanitizeCreativeFileStem(sku, productId);
  const w = Number(width) || 0;
  const h = Number(height) || 0;
  return `${stem}_${w}x${h}.jpg`;
};

const formatPriceRub = (price) => `${Number(price || 0).toLocaleString("ru-RU")} ₽`;

const formatPriceFrom = (price) => `от ${formatPriceRub(price)}`;

const MAX_NAME_LEN = 80;
const MAX_PRICE_LABEL_LEN = 40;
const MAX_SITE_NAME_LEN = 40;

const clipCreativeText = (raw, maxLen) => String(raw ?? "").replace(/\s+/g, " ").trim().slice(0, maxLen);

module.exports = {
  MAX_PRODUCTS,
  MAX_JPEG_BYTES,
  DEFAULT_SCALE,
  ALLOWED_SCALES,
  DESIGN_SCALE,
  DESIGN_MAX_EDGE,
  DEFAULT_SIZE_IDS,
  COMPACT_BLOCK_HEIGHT,
  MAX_NAME_LEN,
  MAX_PRICE_LABEL_LEN,
  MAX_SITE_NAME_LEN,
  MAX_CTA_LEN,
  MAX_COLLAGE_PHOTOS,
  DEFAULT_CTA_TEXT,
  clipCreativeText,
  DIRECT_CREATIVE_SIZES,
  layoutFamilyForBlock,
  getSizeById,
  resolveScale,
  resolveOutputPixels,
  resolveDesignPixels,
  resolveLayoutScale,
  isCompactBlock,
  formatCreativeBrandLine,
  sanitizeCreativeFileStem,
  buildCreativeFilename,
  formatPriceRub,
  formatPriceFrom,
};
