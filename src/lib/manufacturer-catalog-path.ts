import { catalogPagePath } from "@/lib/catalog-page-paths";
import { CATALOG_PAGE_SLUG, resolveCatalogPageSlug } from "@/lib/catalog-page-slugs";
import { manufacturerSlug } from "@/lib/factory-slug";

/**
 * Factory landing under a vitrine: `/catalog/{vitrine}/{factory}`.
 * On the general catalog (`all`) there is no factory path segment — `/catalog/{factory}`
 * would collide with `/catalog/{vitrine}` and 404.
 */
export function manufacturerCatalogPath(
  catalogPageSlug: string,
  manufacturerName: string,
): string {
  const resolved = resolveCatalogPageSlug(catalogPageSlug);
  const base = catalogPagePath(resolved);
  if (!resolved || resolved === CATALOG_PAGE_SLUG.all) return base;
  const slug = manufacturerSlug(manufacturerName);
  if (!slug) return base;
  return `${base}/${encodeURIComponent(slug)}`;
}
