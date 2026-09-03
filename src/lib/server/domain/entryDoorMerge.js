const sharp = require("sharp");

const ENTRY_DOORS_CATEGORY_SLUG = "entry-doors";
const RIGHT_SCALE = 0.9;
const MERGED_UPLOAD_SUBDIR = "merged";
const MERGED_PUBLIC_PREFIX = `/uploads/${MERGED_UPLOAD_SUBDIR}`;
const WHITE = { r: 255, g: 255, b: 255 };

const isMergedImageUrl = (url) => {
  const pathOnly = String(url || "")
    .split("?")[0]
    .toLowerCase();
  if (!pathOnly) return false;
  if (pathOnly.includes(`/${MERGED_UPLOAD_SUBDIR}/`)) return true;
  return /_merged\.(jpe?g|png|webp)$/i.test(pathOnly);
};

const originalImageUrls = (imageUrls) =>
  (Array.isArray(imageUrls) ? imageUrls : [])
    .map((url) => String(url || "").trim())
    .filter((url) => url && !isMergedImageUrl(url));

/** Оригиналы для product_images: без склейки, без дублей, порядок как пришёл. */
const sanitizeProductGalleryUrls = (imageUrls) => {
  const seen = new Set();
  const out = [];
  for (const url of originalImageUrls(imageUrls)) {
    if (seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
};

const mergedFileNameForSku = (sku) => {
  const safe = String(sku || "")
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, "_");
  return `${safe || "door"}_merged.jpg`;
};

const mergedPublicUrlForSku = (sku) => `${MERGED_PUBLIC_PREFIX}/${mergedFileNameForSku(sku)}`;

/**
 * skip — не входные или только готовая склейка без двух оригиналов (текущий каталог).
 * clear — входные, оригиналов меньше двух, склейки в галерее нет.
 * merge — два оригинала, пересобрать производный файл.
 */
const resolveEntryDoorMergeAction = ({ categorySlug, imageUrls } = {}) => {
  const slug = String(categorySlug || "").trim();
  if (slug !== ENTRY_DOORS_CATEGORY_SLUG) {
    return { action: "skip" };
  }
  const urls = Array.isArray(imageUrls) ? imageUrls : [];
  const originals = originalImageUrls(urls);
  if (originals.length >= 2) {
    return { action: "merge", leftUrl: originals[0], rightUrl: originals[1] };
  }
  if (urls.some((url) => isMergedImageUrl(url))) {
    return { action: "skip" };
  }
  return { action: "clear" };
};

const normalizeRgbJpegBuffer = async (buffer) =>
  sharp(buffer)
    .rotate()
    .flatten({ background: WHITE })
    .toBuffer();

/**
 * Склеивает два фото как image_merge.py: левое полное, правое 90% высоты, низ совпадает.
 */
const mergeEntryDoorPair = async (leftBuffer, rightBuffer) => {
  const leftNormalized = await normalizeRgbJpegBuffer(leftBuffer);
  const rightNormalized = await normalizeRgbJpegBuffer(rightBuffer);
  const leftMeta = await sharp(leftNormalized).metadata();
  const rightMeta = await sharp(rightNormalized).metadata();
  const leftWidth = Number(leftMeta.width) || 0;
  const leftHeight = Number(leftMeta.height) || 0;
  const rightWidth = Number(rightMeta.width) || 0;
  const rightHeight = Number(rightMeta.height) || 0;
  if (leftWidth < 1 || leftHeight < 1 || rightWidth < 1 || rightHeight < 1) {
    throw new Error("Некорректный размер исходных фото для склейки");
  }

  const scaledRightHeight = Math.max(1, Math.floor(leftHeight * RIGHT_SCALE));
  const scaledRightWidth = Math.max(
    1,
    Math.round(rightWidth * (scaledRightHeight / rightHeight)),
  );
  const rightResized = await sharp(rightNormalized)
    .resize(scaledRightWidth, scaledRightHeight, { fit: "fill" })
    .toBuffer();

  const canvasWidth = leftWidth + scaledRightWidth;
  const canvasHeight = leftHeight;
  const rightTop = leftHeight - scaledRightHeight;

  const buffer = await sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 3,
      background: WHITE,
    },
  })
    .composite([
      { input: leftNormalized, left: 0, top: 0 },
      { input: rightResized, left: leftWidth, top: rightTop },
    ])
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();

  return {
    buffer,
    width: canvasWidth,
    height: canvasHeight,
    layout: {
      leftWidth,
      leftHeight,
      rightWidth: scaledRightWidth,
      rightHeight: scaledRightHeight,
      rightTop,
      canvasWidth,
      canvasHeight,
    },
  };
};

module.exports = {
  ENTRY_DOORS_CATEGORY_SLUG,
  RIGHT_SCALE,
  MERGED_UPLOAD_SUBDIR,
  MERGED_PUBLIC_PREFIX,
  isMergedImageUrl,
  originalImageUrls,
  sanitizeProductGalleryUrls,
  mergedFileNameForSku,
  mergedPublicUrlForSku,
  resolveEntryDoorMergeAction,
  mergeEntryDoorPair,
};
