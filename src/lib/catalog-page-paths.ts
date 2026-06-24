import { CATALOG_PAGE_SLUG, resolveCatalogPageSlug } from "./catalog-page-slugs";

/** Public path for a catalog vitrine (`/catalog` or `/catalog/vhodnye-dveri`). */
export const catalogPagePath = (slug: string | null | undefined): string => {
  const resolved = resolveCatalogPageSlug(String(slug ?? "").trim() || CATALOG_PAGE_SLUG.all);
  if (!resolved || resolved === CATALOG_PAGE_SLUG.all) return "/catalog";
  return `/catalog/${encodeURIComponent(resolved)}`;
};

/** Slug from `/catalog/[slug]` pathname, or `"all"` for `/catalog`. */
export const isCatalogPathname = (pathname: string | null | undefined): boolean => {
  const normalized = String(pathname || "").replace(/\/+$/, "") || "/";
  return normalized === "/catalog" || normalized.startsWith("/catalog/");
};

export const catalogPageFromPathname = (pathname: string): string => {
  const normalized = String(pathname || "").replace(/\/+$/, "") || "/";
  if (normalized === "/catalog") return CATALOG_PAGE_SLUG.all;
  const prefix = "/catalog/";
  if (!normalized.startsWith(prefix)) return CATALOG_PAGE_SLUG.all;
  const segment = decodeURIComponent(normalized.slice(prefix.length).split("/")[0] || "");
  return resolveCatalogPageSlug(segment || CATALOG_PAGE_SLUG.all);
};
