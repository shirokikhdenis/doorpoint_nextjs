const sharp = require("sharp");

const IMAGE_PRESETS = {
  productCard: { maxEdge: 2000, quality: 82 },
  catalogCard: { maxEdge: 1200, quality: 82 },
  storefrontLabel: { maxEdge: 1600, quality: 82 },
  finishThumb: { maxEdge: 1000, quality: 80 },
  logo: { maxEdge: 512, quality: 85 },
  portfolio: { maxEdge: 1920, quality: 82 },
};

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
  if (subdir === "storefront" || subdir.startsWith("storefront/")) return "storefrontLabel";
  return "storefrontLabel";
};

const shouldOptimizeExtension = (ext) => RASTER_EXTENSIONS.has(String(ext || "").toLowerCase());

const shouldSkipExtension = (ext) => SKIP_EXTENSIONS.has(String(ext || "").toLowerCase());

const optimizeRasterBuffer = async (buffer, { preset = "storefrontLabel" } = {}) => {
  const { maxEdge, quality } = resolvePresetConfig(preset);
  const output = await sharp(buffer)
    .rotate()
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .resize(maxEdge, maxEdge, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: output.data,
    extension: ".jpg",
    contentType: "image/jpeg",
    width: output.info.width,
    height: output.info.height,
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
  resolveImagePreset,
  resolvePresetConfig,
  shouldOptimizeExtension,
  shouldSkipExtension,
  optimizeRasterBuffer,
  getRasterMetadata,
  shouldSkipOptimization,
};
