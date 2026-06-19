import type { CatalogFilterState, CatalogScrollPayload } from "@/features/catalog/catalog-types";
import { catalogPageFromPathname } from "@/lib/catalog-page-paths";
import { resolveCatalogPageSlug as resolveLegacyCatalogPageSlug } from "@/lib/catalog-page-slugs";

export const readCatalogScrollPayload = (): CatalogScrollPayload | null => {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem("catalogScroll");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CatalogScrollPayload;
  } catch {
    return null;
  }
};

/** Active vitrine slug from path, legacy query, or sessionStorage. */
export const resolveCatalogPageSlug = (): string => {
  if (typeof window === "undefined") return "all";
  const fromPath = catalogPageFromPathname(window.location.pathname);
  if (fromPath !== "all") return fromPath;
  const fromQuery = new URLSearchParams(window.location.search).get("catalogPage");
  if (fromQuery) return resolveLegacyCatalogPageSlug(fromQuery);
  const fromStorage = window.sessionStorage.getItem("lastCatalogPage");
  return fromStorage || "all";
};

export const buildInitialCatalogFilters = (): CatalogFilterState => {
  const defaults: CatalogFilterState = {
    search: "",
    sort: "popularity",
    categories: [],
    subcategories: [],
    attrSelections: {},
    attrRanges: {},
    priceRange: { min: "", max: "" },
    onSale: false,
  };
  const payload = readCatalogScrollPayload();
  if (!payload?.catalogPage || payload.catalogPage !== resolveCatalogPageSlug()) {
    return defaults;
  }
  return {
    search: typeof payload.search === "string" ? payload.search : defaults.search,
    sort: typeof payload.sort === "string" && payload.sort ? payload.sort : defaults.sort,
    categories: Array.isArray(payload.categories) ? payload.categories.map(String) : defaults.categories,
    subcategories: Array.isArray(payload.subcategories)
      ? payload.subcategories.map(String)
      : defaults.subcategories,
    attrSelections:
      payload.attrSelections && typeof payload.attrSelections === "object"
        ? Object.fromEntries(
            Object.entries(payload.attrSelections).map(([code, values]) => [
              code,
              Array.isArray(values) ? values.map(String) : [],
            ]),
          )
        : defaults.attrSelections,
    attrRanges:
      payload.attrRanges && typeof payload.attrRanges === "object"
        ? Object.fromEntries(
            Object.entries(payload.attrRanges).map(([code, range]) => [
              code,
              {
                min: typeof range?.min === "string" ? range.min : "",
                max: typeof range?.max === "string" ? range.max : "",
              },
            ]),
          )
        : defaults.attrRanges,
    priceRange:
      payload.priceRange && typeof payload.priceRange === "object"
        ? {
            min: typeof payload.priceRange.min === "string" ? payload.priceRange.min : "",
            max: typeof payload.priceRange.max === "string" ? payload.priceRange.max : "",
          }
        : defaults.priceRange,
    onSale: payload.onSale === true,
  };
};

export const clearCatalogScrollPayload = (): void => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem("catalogScroll");
  } catch {
    /* sessionStorage unavailable */
  }
};

export const saveCatalogScrollPayload = (
  catalogPage: string,
  loadedPages: number,
  filters: CatalogFilterState,
) => {
  if (typeof window === "undefined") return;
  try {
    const payload: CatalogScrollPayload = {
      catalogPage,
      scrollY: window.scrollY,
      loadedPages,
      ...filters,
    };
    window.sessionStorage.setItem("catalogScroll", JSON.stringify(payload));
  } catch {
    /* sessionStorage unavailable */
  }
};
