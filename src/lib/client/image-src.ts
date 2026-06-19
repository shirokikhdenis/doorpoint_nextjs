/** Заглушки в БД вместо реального URL (см. scripts/clear-placeholder-image-x.js). */
const PLACEHOLDER_IMAGES = new Set(["x", "-", "n/a", "na", "null", "undefined", "none"]);

/** Проверяет, что src подходит для next/image. */
export function isValidImageSrc(url: string | undefined | null): boolean {
  const raw = String(url ?? "").trim();
  if (!raw || PLACEHOLDER_IMAGES.has(raw.toLowerCase())) return false;
  if (raw.startsWith("/")) return true;
  return raw.startsWith("http://") || raw.startsWith("https://");
}

/**
 * Приводит URL изображения к виду для next/image и файлов из public/.
 * API иногда отдаёт `http://localhost:3000/uploads/...` — для локальных uploads
 * достаточно pathname (`/uploads/...`). Невалидные значения (например «X») → "".
 */
export function toPublicImageSrc(url: string | undefined | null): string {
  const raw = String(url ?? "").trim();
  if (!raw || PLACEHOLDER_IMAGES.has(raw.toLowerCase())) return "";

  if (raw.startsWith("/")) return raw;

  try {
    const parsed = new URL(raw);
    if (parsed.pathname.startsWith("/uploads/")) {
      return `${parsed.pathname}${parsed.search}`;
    }
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return raw;
    }
  } catch {
    /* не URL */
  }

  return "";
}

/** Локальные файлы из public/ и uploads — отдаём напрямую через nginx, без /_next/image. */
export function shouldBypassImageOptimizer(url: string | undefined | null): boolean {
  const normalized = toPublicImageSrc(url) || String(url ?? "").trim();
  if (!normalized) return false;
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) return false;
  return normalized.startsWith("/");
}
