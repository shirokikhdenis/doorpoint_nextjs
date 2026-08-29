const fs = require("fs/promises");
const path = require("path");
const {
  ARMA_PHOTOS_PUBLIC_URL,
  ARMA_PHOTOS_UPLOAD_SUBDIR,
  ARMA_PHOTOS_MANIFEST_NAME,
  YANDEX_PUBLIC_RESOURCES_URL,
  YANDEX_PAGE_LIMIT,
  mapYandexListingToPhotos,
  uniqueArmaPhotoFilename,
  isLocalArmaPhotoFile,
  mapLocalFileToPhoto,
  groupTagsByCategory,
} = require("../domain/armaPhotos");
const { getUploadsRoot, ensureWritableSubdir } = require("../uploadsPath");
const armaPhotoTagRepository = require("../repositories/armaPhotoTagRepository");
const {
  optimizeRasterBuffer,
  resolveImagePreset,
  shouldOptimizeExtension,
} = require("../imageOptimize");

const CONVERTIBLE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"]);

const getArmaPhotosDir = () => path.join(getUploadsRoot(), ARMA_PHOTOS_UPLOAD_SUBDIR);

const getManifestPath = (dir) => path.join(dir, ARMA_PHOTOS_MANIFEST_NAME);

const sortPhotos = (photos) =>
  [...photos].sort((a, b) => {
    const aTime = a.modifiedAt ? Date.parse(a.modifiedAt) : 0;
    const bTime = b.modifiedAt ? Date.parse(b.modifiedAt) : 0;
    if (aTime !== bTime) return bTime - aTime;
    return a.name.localeCompare(b.name, "ru", { numeric: true, sensitivity: "base" });
  });

const readManifest = async (dir) => {
  try {
    const raw = await fs.readFile(getManifestPath(dir), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeManifest = async (dir, entries) => {
  await fs.writeFile(getManifestPath(dir), `${JSON.stringify(entries, null, 2)}\n`, "utf8");
};

const listArmaPhotos = async () => {
  const dir = getArmaPhotosDir();
  let files = [];
  try {
    files = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }

  const imageFiles = files
    .filter((entry) => entry.isFile() && isLocalArmaPhotoFile(entry.name))
    .map((entry) => entry.name);
  const imageSet = new Set(imageFiles);
  const manifest = await readManifest(dir);
  const used = new Set();
  const photos = [];

  for (const row of manifest) {
    const fileName = String(row?.fileName || "").trim();
    if (!imageSet.has(fileName) || used.has(fileName)) continue;
    used.add(fileName);
    photos.push(
      mapLocalFileToPhoto({
        fileName,
        name: row.name || fileName,
        modifiedAt: row.modifiedAt || null,
      }),
    );
  }

  for (const fileName of imageFiles) {
    if (used.has(fileName)) continue;
    photos.push(mapLocalFileToPhoto({ fileName, name: fileName, modifiedAt: null }));
  }

  return sortPhotos(photos);
};

const buildListUrl = (offset) => {
  const url = new URL(YANDEX_PUBLIC_RESOURCES_URL);
  url.searchParams.set("public_key", ARMA_PHOTOS_PUBLIC_URL);
  url.searchParams.set("limit", String(YANDEX_PAGE_LIMIT));
  url.searchParams.set("offset", String(offset));
  return url.toString();
};

const fetchYandexPage = async (offset) => {
  const response = await fetch(buildListUrl(offset), {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Не удалось загрузить список с Яндекс.Диска (${response.status})${body ? `: ${body.slice(0, 180)}` : ""}`,
    );
  }
  return response.json();
};

const loadRemotePhotos = async () => {
  const collected = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;

  while (offset < total) {
    const page = await fetchYandexPage(offset);
    const items = Array.isArray(page?._embedded?.items) ? page._embedded.items : [];
    collected.push(...items);
    const pageTotal = Number(page?._embedded?.total);
    total = Number.isFinite(pageTotal) ? pageTotal : collected.length;
    const limit = Number(page?._embedded?.limit) || YANDEX_PAGE_LIMIT;
    offset += limit;
    if (items.length === 0) break;
  }

  return mapYandexListingToPhotos({ _embedded: { items: collected } });
};

const downloadBuffer = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Ошибка скачивания (${response.status})`);
  }
  return Buffer.from(await response.arrayBuffer());
};

const savePhotoBuffer = async (dir, photo, usedNames) => {
  const originalExt = path.extname(photo.name || "").toLowerCase();
  const preferPreview = originalExt === ".heic" || originalExt === ".heif";
  const sourceUrl = preferPreview
    ? photo.previewUrl || photo.imageUrl
    : photo.imageUrl || photo.previewUrl;
  if (!sourceUrl) throw new Error("Нет ссылки на файл");

  const buffer = await downloadBuffer(sourceUrl);
  const ext = path.extname(photo.name || "").toLowerCase() || ".jpg";
  let outputBuffer = buffer;
  let outputExt = ext;

  if (CONVERTIBLE_EXTENSIONS.has(ext)) {
    try {
      const optimized = await optimizeRasterBuffer(buffer, {
        preset: resolveImagePreset(ARMA_PHOTOS_UPLOAD_SUBDIR),
      });
      outputBuffer = optimized.buffer;
      outputExt = optimized.extension;
    } catch (error) {
      if (!shouldOptimizeExtension(ext)) {
        throw new Error(`Не удалось конвертировать ${photo.name}: ${error.message}`);
      }
    }
  }

  const desiredName = `${path.parse(photo.name).name}${outputExt}`;
  const fileName = uniqueArmaPhotoFilename(desiredName, usedNames);
  await fs.writeFile(path.join(dir, fileName), outputBuffer);

  return {
    fileName,
    name: photo.name,
    modifiedAt: photo.modifiedAt,
  };
};

const mapWithConcurrency = async (items, limit, mapper) => {
  const results = new Array(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  });

  await Promise.all(workers);
  return results;
};

const downloadArmaPhotosFromYandex = async ({ onProgress } = {}) => {
  const remotePhotos = await loadRemotePhotos();
  const dir = await ensureWritableSubdir(ARMA_PHOTOS_UPLOAD_SUBDIR);
  const usedNames = new Set();
  const errors = [];
  let saved = 0;

  const entries = await mapWithConcurrency(remotePhotos, DOWNLOAD_CONCURRENCY, async (photo, index) => {
    try {
      const entry = await savePhotoBuffer(dir, photo, usedNames);
      saved += 1;
      onProgress?.({ index, total: remotePhotos.length, fileName: entry.fileName });
      return entry;
    } catch (error) {
      errors.push(`${photo.name}: ${error.message}`);
      return null;
    }
  });

  const manifest = entries.filter(Boolean);
  await writeManifest(dir, manifest);

  return {
    total: remotePhotos.length,
    saved: saved,
    errors,
  };
};

const convertLocalHeicWithYandexPreviews = async ({ onProgress } = {}) => {
  const dir = getArmaPhotosDir();
  const files = await fs.readdir(dir);
  const heicFiles = files.filter((name) => {
    const ext = path.extname(name).toLowerCase();
    return ext === ".heic" || ext === ".heif";
  });
  if (heicFiles.length === 0) {
    return { total: 0, saved: 0, errors: [] };
  }

  const remotePhotos = await loadRemotePhotos();
  const remoteByStem = new Map();
  for (const photo of remotePhotos) {
    const originalStem = path.parse(photo.name).name;
    const sanitizedStem = path.parse(uniqueArmaPhotoFilename(`${originalStem}.jpg`, new Set())).name;
    const keys = [originalStem.toLowerCase(), sanitizedStem.toLowerCase()];
    for (const key of keys) {
      if (!remoteByStem.has(key)) remoteByStem.set(key, photo);
    }
  }

  const manifest = await readManifest(dir);
  const usedNames = new Set(
    files
      .filter((name) => name !== ARMA_PHOTOS_MANIFEST_NAME)
      .map((name) => name.toLowerCase()),
  );
  const errors = [];
  let saved = 0;

  for (const [index, fileName] of heicFiles.entries()) {
    const stem = path.parse(fileName).name;
    const remote = remoteByStem.get(stem.toLowerCase());
    if (!remote?.previewUrl) {
      errors.push(`${fileName}: нет JPEG-превью на Яндекс.Диске`);
      continue;
    }
    try {
      usedNames.delete(fileName.toLowerCase());
      const entry = await savePhotoBuffer(
        dir,
        { ...remote, name: `${stem}.jpg`, imageUrl: remote.previewUrl },
        usedNames,
      );
      await fs.unlink(path.join(dir, fileName)).catch(() => {});
      const row = manifest.find((item) => item.fileName === fileName);
      if (row) {
        row.fileName = entry.fileName;
      } else {
        manifest.push(entry);
      }
      saved += 1;
      onProgress?.({ index, total: heicFiles.length, fileName: entry.fileName });
    } catch (error) {
      errors.push(`${fileName}: ${error.message}`);
    }
  }

  await writeManifest(dir, manifest);
  return { total: heicFiles.length, saved, errors };
};

const listAdminArmaGallery = async () => {
  const [photos, categories, tags, links] = await Promise.all([
    listArmaPhotos(),
    armaPhotoTagRepository.listCategories(),
    armaPhotoTagRepository.listTags(),
    armaPhotoTagRepository.listLinks(),
  ]);

  const tagIdsByPhoto = new Map();
  for (const link of links) {
    const current = tagIdsByPhoto.get(link.photoId) || [];
    current.push(link.tagId);
    tagIdsByPhoto.set(link.photoId, current);
  }

  return {
    items: photos.map((photo) => ({
      ...photo,
      tagIds: tagIdsByPhoto.get(photo.id) || [],
    })),
    categories: groupTagsByCategory(categories, tags),
  };
};

const createArmaTagCategory = async (payload) => {
  const name = String(payload?.name || "").trim();
  if (name.length < 1) {
    return { ok: false, message: "Укажите название категории", status: 400 };
  }
  try {
    const item = await armaPhotoTagRepository.createCategory({ name });
    return { ok: true, item };
  } catch (error) {
    if (error?.code === "23505") {
      return { ok: false, message: "Такая категория уже есть", status: 400 };
    }
    throw error;
  }
};

const deleteArmaTagCategory = async (id) => {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return { ok: false, message: "Некорректная категория", status: 400 };
  }
  const deleted = await armaPhotoTagRepository.deleteCategory(numericId);
  if (!deleted) return { ok: false, message: "Категория не найдена", status: 404 };
  return { ok: true };
};

const createArmaTag = async (payload) => {
  const name = String(payload?.name || "").trim();
  const categoryId = Number(payload?.categoryId);
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return { ok: false, message: "Выберите категорию тега", status: 400 };
  }
  if (name.length < 1) {
    return { ok: false, message: "Укажите название тега", status: 400 };
  }
  try {
    const item = await armaPhotoTagRepository.createTag({ categoryId, name });
    return { ok: true, item };
  } catch (error) {
    if (error?.code === "23503") {
      return { ok: false, message: "Категория не найдена", status: 400 };
    }
    if (error?.code === "23505") {
      return { ok: false, message: "Такой тег в этой категории уже есть", status: 400 };
    }
    throw error;
  }
};

const deleteArmaTag = async (id) => {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return { ok: false, message: "Некорректный тег", status: 400 };
  }
  const deleted = await armaPhotoTagRepository.deleteTag(numericId);
  if (!deleted) return { ok: false, message: "Тег не найден", status: 404 };
  return { ok: true };
};

const setArmaPhotoTag = async ({ photoId, tagId, assigned }) => {
  const id = String(photoId || "").trim();
  const numericTagId = Number(tagId);
  if (!id) return { ok: false, message: "Не указано фото", status: 400 };
  if (!Number.isInteger(numericTagId) || numericTagId <= 0) {
    return { ok: false, message: "Некорректный тег", status: 400 };
  }
  try {
    await armaPhotoTagRepository.setPhotoTag({
      photoId: id,
      tagId: numericTagId,
      assigned: assigned !== false,
    });
  } catch (error) {
    if (error?.code === "23503") {
      return { ok: false, message: "Тег не найден", status: 400 };
    }
    throw error;
  }
  const tagIds = await armaPhotoTagRepository.listTagIdsForPhoto(id);
  return { ok: true, photoId: id, tagIds };
};

module.exports = {
  listArmaPhotos,
  listAdminArmaGallery,
  createArmaTagCategory,
  deleteArmaTagCategory,
  createArmaTag,
  deleteArmaTag,
  setArmaPhotoTag,
  downloadArmaPhotosFromYandex,
  convertLocalHeicWithYandexPreviews,
};
