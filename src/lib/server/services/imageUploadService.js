const fs = require("fs/promises");
const path = require("path");
const { randomUUID } = require("crypto");
const { ensureWritableSubdir } = require("../uploadsPath");
const {
  optimizeRasterBuffer,
  resolveImagePreset,
  shouldOptimizeExtension,
} = require("../imageOptimize");

const RASTER_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const SVG_EXTENSION = ".svg";
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const resolveUploadDir = async (relativeSubdir) => {
  const parts = String(relativeSubdir || "")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    throw new Error("Не указана папка для загрузки");
  }

  const root = await ensureWritableSubdir(parts[0]);
  const dir = parts.length === 1 ? root : path.join(root, ...parts.slice(1));
  await fs.mkdir(dir, { recursive: true });

  return {
    dir,
    publicPrefix: `/uploads/${parts.join("/")}`,
  };
};

const saveFilesToSubdir = async (relativeSubdir, fileEntries, options = {}) => {
  const { allowSvg = false } = options;
  const allowed = new Set(RASTER_EXTENSIONS);
  if (allowSvg) allowed.add(SVG_EXTENSION);

  const entries = Array.isArray(fileEntries) ? fileEntries : [];
  if (entries.length === 0) {
    throw new Error("Не выбраны подходящие изображения");
  }

  const { dir, publicPrefix } = await resolveUploadDir(relativeSubdir);
  const savedUrls = [];

  for (const file of entries) {
    if (!file || typeof file.arrayBuffer !== "function") continue;

    const originalName = String(file.name || "image.jpg");
    const ext = path.extname(originalName).toLowerCase();
    if (!allowed.has(ext)) {
      throw new Error(`Недопустимый формат файла: ${originalName}`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length === 0) continue;
    if (buffer.length > MAX_FILE_BYTES) {
      throw new Error(
        `Файл слишком большой (макс. ${MAX_FILE_BYTES / (1024 * 1024)} МБ): ${originalName}`,
      );
    }

    let outputBuffer = buffer;
    let outputExt = ext;

    if (ext === SVG_EXTENSION && allowSvg) {
      // SVG is stored as-is.
    } else if (shouldOptimizeExtension(ext)) {
      const optimized = await optimizeRasterBuffer(buffer, {
        preset: resolveImagePreset(relativeSubdir),
      });
      outputBuffer = optimized.buffer;
      outputExt = optimized.extension;
    } else {
      throw new Error(`Недопустимый формат файла: ${originalName}`);
    }

    const fileName = `${Date.now()}-${randomUUID()}${outputExt}`;
    await fs.writeFile(path.join(dir, fileName), outputBuffer);
    savedUrls.push(`${publicPrefix}/${fileName}`);
  }

  if (savedUrls.length === 0) {
    throw new Error("Не выбраны подходящие изображения");
  }

  return savedUrls;
};

module.exports = {
  MAX_FILE_BYTES,
  RASTER_EXTENSIONS,
  resolveUploadDir,
  saveFilesToSubdir,
};
