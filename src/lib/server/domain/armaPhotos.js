const ARMA_PHOTOS_PUBLIC_URL = "https://disk.yandex.ru/d/z14AY9QrbPGN0w";
const YANDEX_PUBLIC_RESOURCES_URL = "https://cloud-api.yandex.net/v1/disk/public/resources";
const YANDEX_PAGE_LIMIT = 1000;
const PREVIEW_SIZE_ORDER = ["XL", "L", "M", "DEFAULT", "S"];

const IMAGE_MEDIA_TYPES = new Set(["image"]);
const IMAGE_MIME_PREFIX = "image/";

const pickSizeUrl = (sizes, preferredNames) => {
  if (!Array.isArray(sizes)) return "";
  for (const name of preferredNames) {
    const match = sizes.find((item) => item?.name === name && item?.url);
    if (match) return String(match.url);
  }
  return "";
};

const isImageResource = (item) => {
  if (!item || item.type === "dir") return false;
  const mediaType = String(item.media_type || "").trim().toLowerCase();
  if (IMAGE_MEDIA_TYPES.has(mediaType)) return true;
  const mime = String(item.mime_type || "").trim().toLowerCase();
  return mime.startsWith(IMAGE_MIME_PREFIX);
};

const mapYandexResourceToPhoto = (item) => {
  const name = String(item?.name || "").trim();
  const path = String(item?.path || "").trim() || `/${name}`;
  const previewUrl =
    pickSizeUrl(item?.sizes, PREVIEW_SIZE_ORDER) || String(item?.preview || "").trim();
  const imageUrl =
    pickSizeUrl(item?.sizes, ["ORIGINAL"]) ||
    String(item?.file || "").trim() ||
    previewUrl;

  return {
    id: path,
    name,
    previewUrl,
    imageUrl,
    modifiedAt: item?.modified ? String(item.modified) : null,
  };
};

const mapYandexListingToPhotos = (payload) => {
  const items = Array.isArray(payload?._embedded?.items)
    ? payload._embedded.items
    : Array.isArray(payload?.items)
      ? payload.items
      : [];

  return items
    .filter(isImageResource)
    .map(mapYandexResourceToPhoto)
    .filter((photo) => photo.previewUrl || photo.imageUrl)
    .sort((a, b) => {
      const aTime = a.modifiedAt ? Date.parse(a.modifiedAt) : 0;
      const bTime = b.modifiedAt ? Date.parse(b.modifiedAt) : 0;
      if (aTime !== bTime) return bTime - aTime;
      return a.name.localeCompare(b.name, "ru", { numeric: true, sensitivity: "base" });
    });
};

const ARMA_PHOTOS_UPLOAD_SUBDIR = "arma-photos";
const ARMA_PHOTOS_PUBLIC_PREFIX = `/uploads/${ARMA_PHOTOS_UPLOAD_SUBDIR}`;
const ARMA_PHOTOS_MANIFEST_NAME = "manifest.json";
const LOCAL_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

const sanitizeArmaPhotoFilename = (rawName) => {
  const base = String(rawName || "photo").trim().split(/[/\\]/).pop() || "photo";
  const extMatch = base.match(/(\.[a-z0-9]{2,5})$/i);
  const ext = extMatch ? extMatch[1].toLowerCase() : "";
  const stem = (ext ? base.slice(0, -ext.length) : base)
    .replace(/[^\p{L}\p{N}._-]+/gu, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return `${stem || "photo"}${ext || ".jpg"}`;
};

const uniqueArmaPhotoFilename = (desired, used) => {
  const sanitized = sanitizeArmaPhotoFilename(desired);
  const extMatch = sanitized.match(/(\.[a-z0-9]{2,5})$/i);
  const ext = extMatch ? extMatch[1] : ".jpg";
  const stem = extMatch ? sanitized.slice(0, -ext.length) : sanitized;
  let candidate = sanitized;
  let index = 2;
  while (used.has(candidate.toLowerCase())) {
    candidate = `${stem}-${index}${ext}`;
    index += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
};

const isLocalArmaPhotoFile = (fileName) => {
  const name = String(fileName || "").trim();
  if (!name || name === ARMA_PHOTOS_MANIFEST_NAME) return false;
  const ext = name.includes(".") ? `.${name.split(".").pop().toLowerCase()}` : "";
  return LOCAL_IMAGE_EXTENSIONS.has(ext);
};

const mapLocalFileToPhoto = (entry) => {
  const fileName = String(entry?.fileName || "").trim();
  const displayName = String(entry?.name || fileName).trim() || fileName;
  const src = `${ARMA_PHOTOS_PUBLIC_PREFIX}/${encodeURIComponent(fileName)}`;
  return {
    id: fileName,
    name: displayName,
    previewUrl: src,
    imageUrl: src,
    modifiedAt: entry?.modifiedAt ? String(entry.modifiedAt) : null,
  };
};

const groupTagsByCategory = (categories, tags) =>
  categories.map((category) => ({
    ...category,
    tags: tags.filter((tag) => tag.categoryId === category.id),
  }));

const photoMatchesSelectedTags = (photoTagIds, selectedTagIds, tags) => {
  const selected = Array.isArray(selectedTagIds) ? selectedTagIds.map(Number).filter(Boolean) : [];
  if (selected.length === 0) return true;

  const tagById = new Map((tags || []).map((tag) => [Number(tag.id), tag]));
  const selectedByCategory = new Map();
  for (const tagId of selected) {
    const tag = tagById.get(tagId);
    if (!tag) continue;
    const bucket = selectedByCategory.get(tag.categoryId) || [];
    bucket.push(tagId);
    selectedByCategory.set(tag.categoryId, bucket);
  }

  const assigned = new Set((photoTagIds || []).map(Number));
  for (const ids of selectedByCategory.values()) {
    if (!ids.some((id) => assigned.has(id))) return false;
  }
  return true;
};

module.exports = {
  ARMA_PHOTOS_PUBLIC_URL,
  ARMA_PHOTOS_UPLOAD_SUBDIR,
  ARMA_PHOTOS_PUBLIC_PREFIX,
  ARMA_PHOTOS_MANIFEST_NAME,
  YANDEX_PUBLIC_RESOURCES_URL,
  YANDEX_PAGE_LIMIT,
  isImageResource,
  mapYandexResourceToPhoto,
  mapYandexListingToPhotos,
  sanitizeArmaPhotoFilename,
  uniqueArmaPhotoFilename,
  isLocalArmaPhotoFile,
  mapLocalFileToPhoto,
  groupTagsByCategory,
  photoMatchesSelectedTags,
};
