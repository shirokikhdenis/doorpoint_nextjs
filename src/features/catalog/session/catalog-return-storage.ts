import type { CatalogFilterState } from "@/features/catalog/catalog-types";
import type { CatalogReturnPayload } from "@/features/catalog/session/catalog-session-types";
import {
  buildCatalogApiQuery,
  buildCatalogFilterQuery,
  parseCatalogFilterStateFromSearchParams,
} from "@/features/catalog/catalog-filter-utils";
import { catalogPageFromPathname } from "@/lib/catalog-page-paths";
import { resolveCatalogPageSlug as resolveLegacyCatalogPageSlug } from "@/lib/catalog-page-slugs";
import { buildCatalogPublicHref, catalogPagePath } from "@/lib/catalog-url";

const RETURN_STORAGE_KEY = "catalogReturn";
const LEGACY_SCROLL_KEY = "catalogScroll";

const defaultFilterState = (): CatalogFilterState => ({
  search: "",
  sort: "popularity",
  categories: [],
  subcategories: [],
  attrSelections: {},
  attrRanges: {},
  priceRange: { min: "", max: "" },
  onSale: false,
});

const readRaw = (key: string): unknown => {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const filterStateFromRecord = (record: Record<string, unknown>): CatalogFilterState | undefined => {
  const hasFilterFields =
    "search" in record ||
    "sort" in record ||
    "categories" in record ||
    "subcategories" in record ||
    "attrSelections" in record ||
    "attrRanges" in record ||
    "priceRange" in record ||
    "onSale" in record;

  if (!hasFilterFields) return undefined;

  const defaults = defaultFilterState();
  return {
    search: typeof record.search === "string" ? record.search : defaults.search,
    sort: typeof record.sort === "string" && record.sort ? record.sort : defaults.sort,
    categories: Array.isArray(record.categories)
      ? record.categories.map(String)
      : defaults.categories,
    subcategories: Array.isArray(record.subcategories)
      ? record.subcategories.map(String)
      : defaults.subcategories,
    attrSelections:
      record.attrSelections && typeof record.attrSelections === "object"
        ? Object.fromEntries(
            Object.entries(record.attrSelections as Record<string, unknown>).map(
              ([code, values]) => [code, Array.isArray(values) ? values.map(String) : []],
            ),
          )
        : defaults.attrSelections,
    attrRanges:
      record.attrRanges && typeof record.attrRanges === "object"
        ? Object.fromEntries(
            Object.entries(record.attrRanges as Record<string, unknown>).map(([code, range]) => {
              const value = range as { min?: unknown; max?: unknown } | undefined;
              return [
                code,
                {
                  min: typeof value?.min === "string" ? value.min : "",
                  max: typeof value?.max === "string" ? value.max : "",
                },
              ];
            }),
          )
        : defaults.attrRanges,
    priceRange:
      record.priceRange && typeof record.priceRange === "object"
        ? {
            min:
              typeof (record.priceRange as { min?: unknown }).min === "string"
                ? (record.priceRange as { min: string }).min
                : "",
            max:
              typeof (record.priceRange as { max?: unknown }).max === "string"
                ? (record.priceRange as { max: string }).max
                : "",
          }
        : defaults.priceRange,
    onSale: record.onSale === true,
  };
};

/** Build public catalog href from API searchKey (catalogPage + filter params). */
export const buildCatalogReturnHrefFromSearchKey = (searchKey: string): string => {
  const params = new URLSearchParams(searchKey);
  const catalogPage = params.get("catalogPage") || "all";
  const flat: Record<string, string> = {};
  params.forEach((value, key) => {
    if (key === "catalogPage" || key === "page" || key === "limit") return;
    flat[key] = value;
  });
  return buildCatalogPublicHref(catalogPage, parseCatalogFilterStateFromSearchParams(flat));
};

/** Canonical return href from vitrine + filters (+ optional catalogLabel). */
export const buildCatalogReturnHrefFromFilters = (
  catalogPage: string,
  filterState: CatalogFilterState,
  catalogLabelId?: number,
): string => {
  const path = catalogPagePath(catalogPage);
  const params = new URLSearchParams(buildCatalogFilterQuery(filterState));
  if (catalogLabelId && Number.isFinite(catalogLabelId)) {
    params.set("catalogLabel", String(catalogLabelId));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
};

const normalizePayload = (raw: unknown): CatalogReturnPayload | null => {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const catalogPage = String(record.catalogPage || "").trim();
  if (!catalogPage) return null;
  const scrollY = Math.max(0, Number(record.scrollY) || 0);
  const loadedPages = Math.min(25, Math.max(1, Number(record.loadedPages) || 1));
  const filterState = filterStateFromRecord(record);
  const searchKey =
    typeof record.searchKey === "string" && record.searchKey.trim()
      ? record.searchKey.trim()
      : filterState
        ? buildCatalogApiQuery(catalogPage, filterState)
        : "";
  const returnHref =
    typeof record.returnHref === "string" && record.returnHref.trim()
      ? record.returnHref.trim()
      : filterState
        ? buildCatalogReturnHrefFromFilters(catalogPage, filterState)
        : searchKey
          ? buildCatalogReturnHrefFromSearchKey(searchKey)
          : catalogPagePath(catalogPage);
  if (loadedPages <= 1 && scrollY <= 0) return null;
  return {
    catalogPage,
    scrollY,
    loadedPages,
    searchKey,
    returnHref,
    filterState,
  };
};

/** Read return payload (new key first, legacy catalogScroll fallback). */
export const readCatalogReturnPayload = (): CatalogReturnPayload | null => {
  const fromNew = normalizePayload(readRaw(RETURN_STORAGE_KEY));
  if (fromNew) return fromNew;

  const legacy = readRaw(LEGACY_SCROLL_KEY) as Record<string, unknown> | null;
  if (!legacy) return null;
  return normalizePayload(legacy);
};

export const resolveCatalogPageSlug = (): string => {
  if (typeof window === "undefined") return "all";
  const fromPath = catalogPageFromPathname(window.location.pathname);
  if (fromPath !== "all") return fromPath;
  const fromQuery = new URLSearchParams(window.location.search).get("catalogPage");
  if (fromQuery) return resolveLegacyCatalogPageSlug(fromQuery);
  const fromStorage = window.sessionStorage.getItem("lastCatalogPage");
  return fromStorage || "all";
};

export const hasCatalogReturnRestore = (): boolean => {
  const payload = readCatalogReturnPayload();
  if (!payload?.catalogPage || payload.catalogPage !== resolveCatalogPageSlug()) return false;
  return payload.loadedPages > 1 || payload.scrollY > 0;
};

export const clearCatalogReturnPayload = (): void => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(RETURN_STORAGE_KEY);
    window.sessionStorage.removeItem(LEGACY_SCROLL_KEY);
  } catch {
    /* sessionStorage unavailable */
  }
};

export const saveCatalogReturnPayload = (payload: CatalogReturnPayload): void => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(RETURN_STORAGE_KEY, JSON.stringify(payload));
    window.sessionStorage.removeItem(LEGACY_SCROLL_KEY);
  } catch {
    /* sessionStorage unavailable */
  }
};

export const buildCatalogReturnHref = (): string => {
  const payload = readCatalogReturnPayload();
  if (payload?.filterState && payload.returnHref) return payload.returnHref;
  if (payload?.filterState) {
    return buildCatalogReturnHrefFromFilters(payload.catalogPage, payload.filterState);
  }
  if (payload?.searchKey) return buildCatalogReturnHrefFromSearchKey(payload.searchKey);
  if (payload?.returnHref) return payload.returnHref;
  if (typeof window !== "undefined") {
    const slug = window.sessionStorage.getItem("lastCatalogPage");
    if (slug?.trim()) return catalogPagePath(slug.trim());
  }
  return "/catalog";
};
