const fs = require("fs/promises");
const path = require("path");
const sharp = require("sharp");

const IMAGE_PRESETS = {
  productCard: { maxEdge: 2000, quality: 82 },
  catalogCard: { maxEdge: 1200, quality: 82 },
  storefrontLabel: { maxEdge: 1600, quality: 82 },
  finishThumb: { maxEdge: 1000, quality: 80 },
  logo: { maxEdge: 512, quality: 85 },
  portfolio: { maxEdge: 1920, quality: 82 },
  /** Карточки каталога / фабрик / коллекций — оригинал на диске не трогаем. */
  cardThumb: { maxEdge: 800, quality: 78 },
};

const CARD_THUMB_INFIX = ".card";
const CARD_THUMB_EXTENSION = ".jpg";

const RASTER_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const SKIP_EXTENSIONS = new Set([".svg", ".gif"]);

const envNumber = (name, fallback) => {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const resolvePresetConfig = (presetName) => {
  const base = IMAGE_PRESETS[presetName] || IMAGE_PRESETS.storefrontLabel;
  if (presetName === "productCard") {
    return {
      maxEdge: envNumber("IMAGE_MAX_EDGE_PRODUCT", base.maxEdge),
      quality: envNumber("IMAGE_JPEG_QUALITY", base.quality),
    };
  }
  return {
    maxEdge: base.maxEdge,
    quality: envNumber("IMAGE_JPEG_QUALITY", base.quality),
  };
};

const normalizeSubdir = (relativeSubdir) =>
  String(relativeSubdir || "")
    .split("/")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
    .join("/");

const resolveImagePreset = (relativeSubdir) => {
  const subdir = normalizeSubdir(relativeSubdir);
  if (!subdir) return "storefrontLabel";
  if (subdir === "products" || subdir === "merged") return "productCard";
  if (subdir === "furnitura" || subdir.startsWith("furnitura/")) return "catalogCard";
  if (subdir === "finishes" || subdir.startsWith("finishes/")) return "finishThumb";
  if (subdir === "factories/logos" || subdir.startsWith("factories/logos/")) return "logo";
  if (subdir === "factories/doors" || subdir.startsWith("factories/doors/")) return "storefrontLabel";
  if (subdir === "portfolio" || subdir.startsWith("portfolio/")) return "portfolio";
  if (subdir === "arma-photos" || subdir.startsWith("arma-photos/")) return "portfolio";
  if (subdir === "storefront" || subdir.startsWith("storefront/")) return "storefrontLabel";
  return "storefrontLabel";
};

const shouldOptimizeExtension = (ext) => RASTER_EXTENSIONS.has(String(ext || "").toLowerCase());

const shouldSkipExtension = (ext) => SKIP_EXTENSIONS.has(String(ext || "").toLowerCase());

const optimizeRasterBuffer = async (buffer, { preset = "storefrontLabel" } = {}) => {
  const { maxEdge, quality } = resolvePresetConfig(preset);
  const jpeg = await sharp(buffer)
    .rotate()
    .resize(maxEdge, maxEdge, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: jpeg.data,
    extension: ".jpg",
    contentType: "image/jpeg",
    width: jpeg.info.width,
    height: jpeg.info.height,
    maxEdge,
  };
};

const getRasterMetadata = async (buffer) => {
  const metadata = await sharp(buffer).metadata();
  const width = Number(metadata.width) || 0;
  const height = Number(metadata.height) || 0;
  return {
    width,
    height,
    maxEdge: Math.max(width, height),
  };
};

/**
 * Skip re-encoding when file is already small JPEG within preset bounds.
 */
const isCardThumbFileName = (filePath) =>
  /\.card\.(jpe?g|png|webp)$/i.test(path.basename(String(filePath || "")));

const cardThumbOutputPath = (sourceFullPath) => {
  const dir = path.dirname(sourceFullPath);
  const ext = path.extname(sourceFullPath);
  const base = path.basename(sourceFullPath, ext).replace(/\.card$/i, "");
  return path.join(dir, `${base}${CARD_THUMB_INFIX}${CARD_THUMB_EXTENSION}`);
};

const shouldGenerateCardThumbForSubdir = (relativeSubdir) => {
  const subdir = normalizeSubdir(relativeSubdir);
  if (subdir === "products" || subdir === "merged") return true;
  if (subdir === "furnitura" || subdir.startsWith("furnitura/")) return true;
  if (subdir === "factories/doors" || subdir.startsWith("factories/doors/")) return true;
  if (subdir === "storefront" || subdir.startsWith("storefront/")) return true;
  return false;
};

/** Пишет соседний `name.card.jpg` (оригинал не меняет). */
const writeCardThumbBeside = async (sourceFullPath, sourceBuffer, relativeSubdir) => {
  if (!shouldGenerateCardThumbForSubdir(relativeSubdir)) return null;
  if (isCardThumbFileName(sourceFullPath)) return null;
  const outputPath = cardThumbOutputPath(sourceFullPath);
  const thumb = await optimizeRasterBuffer(sourceBuffer, { preset: "cardThumb" });
  await fs.writeFile(outputPath, thumb.buffer);
  return outputPath;
};

const shouldSkipOptimization = async (buffer, { preset = "storefrontLabel", fileSizeBytes = 0, minSizeKb = 200 } = {}) => {
  const { maxEdge } = resolvePresetConfig(preset);
  if (fileSizeBytes > 0 && fileSizeBytes < minSizeKb * 1024) {
    const metadata = await getRasterMetadata(buffer);
    if (metadata.maxEdge > 0 && metadata.maxEdge <= maxEdge) {
      return true;
    }
  }
  return false;
};

module.exports = {
  IMAGE_PRESETS,
  RASTER_EXTENSIONS,
  SKIP_EXTENSIONS,
  CARD_THUMB_INFIX,
  CARD_THUMB_EXTENSION,
  resolveImagePreset,
  resolvePresetConfig,
  shouldOptimizeExtension,
  shouldSkipExtension,
  optimizeRasterBuffer,
  getRasterMetadata,
  shouldSkipOptimization,
  isCardThumbFileName,
  cardThumbOutputPath,
  shouldGenerateCardThumbForSubdir,
  writeCardThumbBeside,
};
