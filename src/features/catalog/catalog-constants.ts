import type { CatalogMeta } from "@/lib/client/normalizers";
import { CATALOG_PAGE_SLUG, resolveCatalogPageSlug } from "@/lib/catalog-page-slugs";

export const CATALOG_CARDS_PER_ROW_MIN = 2;
export const CATALOG_CARDS_PER_ROW_MAX = 8;
export const CATALOG_GRID_ROWS_MIN = 1;
export const CATALOG_GRID_ROWS_MAX = 12;

export type CatalogCardImageHeight = "default" | "compact";

export type CatalogGridLayout = {
  cardsPerRow: number;
  gridRows: number;
  cardImageHeight: CatalogCardImageHeight;
};

/** Fallback: 4 карточки × 5 рядов. */
export const CATALOG_PAGE_LIMIT = 20;
/** Fallback для фурнитуры: 6 × 4. */
export const CATALOG_FITTINGS_PAGE_LIMIT = 24;

export const CATALOG_CARD_IMAGE_HEIGHT_DEFAULT = "h-[240px] sm:h-[320px] lg:h-[360px]";
export const CATALOG_CARD_IMAGE_HEIGHT_COMPACT = "h-[180px] sm:h-[220px] lg:h-[240px]";
export const CATALOG_CARD_IMAGE_HEIGHT = CATALOG_CARD_IMAGE_HEIGHT_DEFAULT;

export function parseCardImageHeight(
  value: unknown,
  fallback: CatalogCardImageHeight = "default",
): CatalogCardImageHeight {
  return String(value || fallback).trim() === "compact" ? "compact" : "default";
}

export function defaultCardImageHeight(slug?: string): CatalogCardImageHeight {
  return resolveCatalogPageSlug(slug ?? "") === CATALOG_PAGE_SLUG.fittings ? "compact" : "default";
}

export function catalogCardImageHeightClass(value?: unknown) {
  return parseCardImageHeight(value) === "compact"
    ? CATALOG_CARD_IMAGE_HEIGHT_COMPACT
    : CATALOG_CARD_IMAGE_HEIGHT_DEFAULT;
}

export function defaultCatalogLayout(slug?: string): CatalogGridLayout {
  return resolveCatalogPageSlug(slug ?? "") === CATALOG_PAGE_SLUG.fittings
    ? { cardsPerRow: 6, gridRows: 4, cardImageHeight: "compact" }
    : { cardsPerRow: 4, gridRows: 5, cardImageHeight: "default" };
}

export function clampCardsPerRow(value: unknown, fallback = 4): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(CATALOG_CARDS_PER_ROW_MAX, Math.max(CATALOG_CARDS_PER_ROW_MIN, Math.round(n)));
}

export function clampGridRows(value: unknown, fallback = 5): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(CATALOG_GRID_ROWS_MAX, Math.max(CATALOG_GRID_ROWS_MIN, Math.round(n)));
}

export function resolveCatalogGridLayout(
  slug?: string,
  page?: {
    cardsPerRow?: number | null;
    gridRows?: number | null;
    cardImageHeight?: string | null;
  } | null,
): CatalogGridLayout {
  const fallback = defaultCatalogLayout(slug);
  return {
    cardsPerRow: clampCardsPerRow(page?.cardsPerRow, fallback.cardsPerRow),
    gridRows: clampGridRows(page?.gridRows, fallback.gridRows),
    cardImageHeight: parseCardImageHeight(page?.cardImageHeight, fallback.cardImageHeight),
  };
}

export function catalogPageLimit(
  slug?: string,
  page?: {
    cardsPerRow?: number | null;
    gridRows?: number | null;
    cardImageHeight?: string | null;
  } | null,
) {
  const layout = resolveCatalogGridLayout(slug, page);
  return layout.cardsPerRow * layout.gridRows;
}

/** Статические классы: Tailwind не видит `lg:grid-cols-${n}`. */
const GRID_CLASS_BY_COLS: Record<number, string> = {
  2: "grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-2 lg:grid-cols-2",
  3: "grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-3",
  4: "grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4",
  5: "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5",
  6: "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6",
  7: "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-7",
  8: "grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 lg:grid-cols-8",
};

export function catalogGridClass(cardsPerRow?: number, slug?: string) {
  const layout = resolveCatalogGridLayout(slug, { cardsPerRow, gridRows: 1 });
  return GRID_CLASS_BY_COLS[layout.cardsPerRow] ?? GRID_CLASS_BY_COLS[4];
}

export const emptyCatalogMeta: CatalogMeta = {
  categories: [],
  subcategories: [],
  attributeFilters: [],
  price: { min: 0, max: 0 },
  labels: [],
  collapsedFilterSections: null,
};
