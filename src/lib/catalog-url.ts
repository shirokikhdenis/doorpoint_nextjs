import type { CatalogFilterState } from "@/features/catalog/catalog-types";
import { buildCatalogFilterQuery } from "@/features/catalog/catalog-filter-utils";
import { catalogPageFromPathname, catalogPagePath } from "@/lib/catalog-page-paths";

export { catalogPageFromPathname, catalogPagePath };
export { buildCatalogApiQuery, buildCatalogFilterQuery } from "@/features/catalog/catalog-filter-utils";

/** Full public href: path + optional filter query. */
export const buildCatalogPublicHref = (
  catalogPage: string,
  filters?: CatalogFilterState,
): string => {
  const path = catalogPagePath(catalogPage);
  if (!filters) return path;
  const qs = buildCatalogFilterQuery(filters);
  return qs ? `${path}?${qs}` : path;
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
