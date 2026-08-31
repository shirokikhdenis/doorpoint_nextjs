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

const normalizePathname = (pathname: string): string =>
  pathname
    .split("/")
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    })
    .join("/");

/** Compare catalog hrefs ignoring query encoding and param order. */
export const catalogHrefsEquivalent = (left: string, right: string): boolean => {
  const parse = (href: string) => {
    const url = new URL(href, "http://catalog.local");
    const pairs = [...url.searchParams.entries()].sort(([aK, aV], [bK, bV]) =>
      aK === bK ? aV.localeCompare(bV) : aK.localeCompare(bK),
    );
    return { path: normalizePathname(url.pathname), pairs };
  };
  try {
    const a = parse(left);
    const b = parse(right);
    if (a.path !== b.path || a.pairs.length !== b.pairs.length) return false;
    return a.pairs.every(([key, value], index) => {
      const other = b.pairs[index];
      return other[0] === key && other[1] === value;
    });
  } catch {
    return left === right;
  }
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
  if (!catalogHrefsEquivalent(next, cur)) {
    window.history.replaceState(window.history.state, "", next);
  }
};

/** Write catalog href into the address bar without remounting the page. */
export const replaceCatalogHref = (nextHref: string): void => {
  if (typeof window === "undefined") return;
  const cur = `${window.location.pathname}${window.location.search}`;
  if (catalogHrefsEquivalent(nextHref, cur)) return;
  window.history.replaceState(window.history.state, "", nextHref);
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
