import { catalogPagePath } from "@/lib/catalog-page-paths";
import { manufacturerSlug } from "@/lib/factory-slug";

export function manufacturerCatalogPath(
  catalogPageSlug: string,
  manufacturerName: string,
): string {
  const base = catalogPagePath(catalogPageSlug);
  const slug = manufacturerSlug(manufacturerName);
  if (!slug) return base;
  return `${base}/${encodeURIComponent(slug)}`;
}
