import type { CatalogFilterState } from "@/features/catalog/catalog-types";
import { buildCatalogFilterQuery } from "@/features/catalog/catalog-filter-utils";
import { catalogPageFromPathname, catalogPagePath } from "@/lib/catalog-page-paths";
import { manufacturerCatalogPath } from "@/lib/manufacturer-catalog-path";

export { catalogPageFromPathname, catalogPagePath };
export { buildCatalogApiQuery, buildCatalogFilterQuery } from "@/features/catalog/catalog-filter-utils";

export const hrefWithoutPage = (href: string): string => {
  const qIndex = href.indexOf("?");
  if (qIndex < 0) return href;
  const path = href.slice(0, qIndex);
  const params = new URLSearchParams(href.slice(qIndex + 1));
  params.delete("page");
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
};

/** Public catalog URL: a single manufacturer becomes `/catalog/{vitrine}/{factory}`. */
export const catalogHrefFromFilters = (
  catalogPage: string,
  filters: CatalogFilterState,
  options?: { catalogLabelId?: number; page?: number },
): string => {
  const manufacturers = filters.attrSelections.manufacturer || [];
  const path =
    manufacturers.length === 1
      ? manufacturerCatalogPath(catalogPage, manufacturers[0])
      : catalogPagePath(catalogPage);
  const params = new URLSearchParams(buildCatalogFilterQuery(filters));
  if (manufacturers.length === 1) params.delete("attr_manufacturer");
  if (options?.catalogLabelId && Number.isFinite(options.catalogLabelId)) {
    params.set("catalogLabel", String(options.catalogLabelId));
  }
  if (options?.page && options.page > 1) params.set("page", String(options.page));
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
};

/** Update `?page=` without App Router navigation (keeps appended load-more rows). */
export const replaceCatalogPageQuery = (page: number): void => {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (page > 1) url.searchParams.set("page", String(page));
  else url.searchParams.delete("page");
  const next = `${url.pathname}${url.search}`;
  const cur = `${window.location.pathname}${window.location.search}`;
  if (next !== cur) window.history.replaceState(window.history.state, "", next);
};

/** Full public href: path + optional filter query. */
export const buildCatalogPublicHref = (
  catalogPage: string,
  filters?: CatalogFilterState,
): string => {
  if (!filters) return catalogPagePath(catalogPage);
  return catalogHrefFromFilters(catalogPage, filters);
};

/** Merge extra query keys (e.g. catalogLabel) into a public href. */
export const buildCatalogPublicHrefFromFlat = (
  catalogPage: string,
  flat: Record<string, string>,
): string => {
  const path = catalogPagePath(catalogPage);
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(flat)) {
    if (key === "catalogPage" || key === "page") continue;
    if (value.trim()) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
};
