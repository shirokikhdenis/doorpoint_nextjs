const fs = require("fs/promises");
const path = require("path");
const { normalizeDecorKey } = require("../../bravo-decor-swatch");
const { joinUploads, ensureWritableSubdir } = require("../uploadsPath");
const {
  optimizeRasterBuffer,
  resolveImagePreset,
  shouldOptimizeExtension,
} = require("../imageOptimize");

const COLORS_EXPORT_URL = "https://dveri.com/export/json/moskva";
const CACHE_TTL_MS = 6 * 60 * 60_000;
const UPLOAD_SUBDIR = "finishes/bravo";
const PUBLIC_PREFIX = `/uploads/${UPLOAD_SUBDIR}`;
const MANIFEST_NAME = "manifest.json";

/**
 * Pictograms used on dveri.com catalogs / product cards live under /storage/colors/
 * (often filenames like dver-mezhkomnatnaya-…-white-silk-….jpg).
 * Do NOT use /storage/colors/decors/ — those are separate texture samples.
 */
const isCatalogColorPictogram = (url) => {
  const lower = String(url || "").toLowerCase();
  if (!lower.includes("/storage/colors/")) return false;
  if (lower.includes("/storage/colors/decors/")) return false;
  if (lower.includes("/banners/")) return false;
  return true;
};

/** @type {{ map: Map<string, string>; fetchedAt: number } | null} */
let cache = null;
/** @type {Promise<Map<string, string>> | null} */
let inflight = null;

const absoluteDveriUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  if (raw.startsWith("/")) return `https://dveri.com${raw}`;
  return "";
};

const putSwatch = (map, keySource, imageUrl) => {
  const key = normalizeDecorKey(keySource);
  const image = absoluteDveriUrl(imageUrl);
  if (!key || !image || !isCatalogColorPictogram(image)) return;
  if (!map.has(key)) map.set(key, image);
};

const mergeExportColorPictures = (map, colors) => {
  for (const color of Array.isArray(colors) ? colors : []) {
    putSwatch(map, color?.title, color?.picture);
  }
  return map;
};

const fetchText = async (url) => {
  const response = await fetch(url, {
    headers: { Accept: "application/json,text/html" },
  });
  if (!response.ok) {
    throw new Error(`dveri.com ${url} → ${response.status}`);
  }
  return response.text();
};

const buildRemoteSwatchMap = async () => {
  const map = new Map();
  const rawText = await fetchText(COLORS_EXPORT_URL);
  const payload = JSON.parse(rawText);
  mergeExportColorPictures(map, payload?.colors);
  return map;
};

/** Stable filename for a decor key: `nordic oak` → `nordic-oak.jpg` */
const decorKeyToFileStem = (key) =>
  normalizeDecorKey(key)
    .replace(/[^a-z0-9а-яё\s-]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "decor";

const getManifestPath = () => joinUploads(UPLOAD_SUBDIR, MANIFEST_NAME);

const readLocalManifest = async () => {
  try {
    const raw = await fs.readFile(getManifestPath(), "utf8");
    const parsed = JSON.parse(raw);
    const map = new Map();
    if (parsed && typeof parsed === "object" && parsed.swatches) {
      for (const [key, url] of Object.entries(parsed.swatches)) {
        const normalized = normalizeDecorKey(key);
        const image = String(url || "").trim();
        if (normalized && image.startsWith("/uploads/")) map.set(normalized, image);
      }
    }
    return map;
  } catch {
    return new Map();
  }
};

const writeLocalManifest = async (map, meta = {}) => {
  await ensureWritableSubdir(UPLOAD_SUBDIR);
  const swatches = {};
  for (const [key, url] of map) {
    swatches[key] = url;
  }
  const payload = {
    updatedAt: new Date().toISOString(),
    source: "dveri.com/export/json colors.picture",
    count: map.size,
    ...meta,
    swatches,
  };
  await fs.writeFile(getManifestPath(), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
};

const extensionFromUrlOrType = (url, contentType) => {
  const fromUrl = path.extname(String(url || "").split("?")[0]).toLowerCase();
  if (shouldOptimizeExtension(fromUrl)) return fromUrl === ".jpeg" ? ".jpg" : fromUrl;
  const type = String(contentType || "").toLowerCase();
  if (type.includes("png")) return ".png";
  if (type.includes("webp")) return ".webp";
  return ".jpg";
};

const downloadOneSwatch = async (key, remoteUrl, { force = false } = {}) => {
  const stem = decorKeyToFileStem(key);
  const dir = await ensureWritableSubdir(UPLOAD_SUBDIR);
  const existing = (await fs.readdir(dir).catch(() => [])).find(
    (name) => name === `${stem}.jpg` || name === `${stem}.png` || name === `${stem}.webp`,
  );
  if (existing && !force) {
    return { localUrl: `${PUBLIC_PREFIX}/${existing}`, reused: true };
  }

  const response = await fetch(remoteUrl, {
    headers: { Accept: "image/*,*/*" },
  });
  if (!response.ok) {
    throw new Error(`download ${remoteUrl} → ${response.status}`);
  }
  const contentType = response.headers.get("content-type") || "";
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0) throw new Error(`empty image: ${remoteUrl}`);

  const sourceExt = extensionFromUrlOrType(remoteUrl, contentType);
  let outputBuffer = buffer;
  let outputExt = sourceExt === ".jpeg" ? ".jpg" : sourceExt;
  if (shouldOptimizeExtension(sourceExt)) {
    const optimized = await optimizeRasterBuffer(buffer, {
      preset: resolveImagePreset(UPLOAD_SUBDIR),
    });
    outputBuffer = optimized.buffer;
    outputExt = optimized.extension;
  }

  const fileName = `${stem}${outputExt}`;
  const fullPath = path.join(dir, fileName);
  await fs.writeFile(fullPath, outputBuffer);
  return { localUrl: `${PUBLIC_PREFIX}/${fileName}`, reused: false };
};

/**
 * Download Bravo catalog color pictograms into public/uploads/finishes/bravo
 * and write manifest.json with local public URLs.
 */
const syncBravoDecorSwatches = async ({ force = false, onProgress } = {}) => {
  const remote = await buildRemoteSwatchMap();
  if (remote.size === 0) {
    throw new Error("Не удалось получить цвета из выгрузки dveri.com");
  }

  const local = new Map();
  let downloaded = 0;
  let reused = 0;
  let failed = 0;
  const errors = [];

  let index = 0;
  for (const [key, remoteUrl] of remote) {
    index += 1;
    try {
      const { localUrl, reused: wasReused } = await downloadOneSwatch(key, remoteUrl, {
        force,
      });
      local.set(key, localUrl);
      if (wasReused) reused += 1;
      else downloaded += 1;
      onProgress?.({
        index,
        total: remote.size,
        key,
        localUrl,
        remoteUrl,
        status: wasReused ? "reused" : "downloaded",
      });
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${key}: ${message}`);
      onProgress?.({ index, total: remote.size, key, status: "error", error: message });
    }
  }

  await writeLocalManifest(local, { downloaded, reused, failed, remoteCount: remote.size });
  cache = { map: local, fetchedAt: Date.now() };
  return {
    ok: true,
    count: local.size,
    downloaded,
    reused,
    failed,
    errors,
    dir: PUBLIC_PREFIX,
  };
};

const mapToObject = (map) => {
  const out = {};
  for (const [key, value] of map) out[key] = value;
  return out;
};

const getBravoDecorSwatchMap = async ({ refresh = false } = {}) => {
  if (!refresh && cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.map;
  }
  if (!refresh && inflight) return inflight;

  inflight = (async () => {
    const local = await readLocalManifest();
    if (local.size > 0) {
      cache = { map: local, fetchedAt: Date.now() };
      return local;
    }

    const remote = await buildRemoteSwatchMap();
    if (remote.size > 0) {
      cache = { map: remote, fetchedAt: Date.now() };
    }
    return remote;
  })().finally(() => {
    inflight = null;
  });

  return inflight;
};

module.exports = {
  COLORS_EXPORT_URL,
  UPLOAD_SUBDIR,
  PUBLIC_PREFIX,
  mergeExportColorPictures,
  getBravoDecorSwatchMap,
  syncBravoDecorSwatches,
  isCatalogColorPictogram,
  decorKeyToFileStem,
  readLocalManifest,
  mapToObject,
};
