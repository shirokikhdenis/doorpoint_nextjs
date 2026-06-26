import { createRequire } from "node:module";
import { unstable_cache } from "next/cache";

const require = createRequire(import.meta.url);

const catalogService = require("@/lib/server/services/catalogService") as {
  listCatalogPages: () => Promise<unknown[]>;
  getFilterMeta: (query: { catalogPage: string }) => Promise<unknown>;
  getProducts: (query: Record<string, string>) => Promise<unknown>;
};

const homePageService = require("@/lib/server/services/homePageService") as {
  getHomePageData: () => Promise<unknown>;
};

const promotionService = require("@/lib/server/services/promotionService") as {
  listActivePromotions: () => Promise<unknown[]>;
};

export const STOREFRONT_API_CACHE_CONTROL =
  "public, s-maxage=60, stale-while-revalidate=120";

/** Stable cache key for product list queries. */
export function normalizeProductsQueryKey(query: Record<string, string>): string {
  const params = new URLSearchParams();
  Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([key, value]) => {
      params.set(key, String(value));
    });
  return params.toString();
}

const isFilteredProductsQuery = (queryKey: string): boolean => {
  const params = new URLSearchParams(queryKey);
  if (params.get("search")?.trim()) return true;
  if (params.get("categories")?.trim()) return true;
  if (params.get("subcategories")?.trim()) return true;
  if (params.get("minPrice")?.trim()) return true;
  if (params.get("maxPrice")?.trim()) return true;
  if (params.get("onSale") === "1") return true;
  for (const key of params.keys()) {
    if (key.startsWith("attr_")) return true;
  }
  const page = Number(params.get("page") || "1");
  return page > 1;
};

const fetchCatalogPages = async () => catalogService.listCatalogPages();

const fetchFilterMeta = async (catalogPage: string) =>
  catalogService.getFilterMeta({ catalogPage });

const fetchProducts = async (queryKey: string) => {
  const query = Object.fromEntries(new URLSearchParams(queryKey)) as Record<string, string>;
  return catalogService.getProducts(query);
};

const fetchHomePageData = async () => homePageService.getHomePageData();

const fetchActivePromotions = async () => promotionService.listActivePromotions();

const getCachedCatalogPagesInner = unstable_cache(
  fetchCatalogPages,
  ["storefront", "catalog-pages"],
  { tags: ["catalog-pages"], revalidate: 300 },
);

const getCachedFilterMetaInner = unstable_cache(
  fetchFilterMeta,
  ["storefront", "catalog-meta"],
  { tags: ["catalog-meta"], revalidate: 180 },
);

const getCachedHomePageDataInner = unstable_cache(
  fetchHomePageData,
  ["storefront", "home-hits"],
  { tags: ["home-hits", "home-sections", "catalog-products"], revalidate: 120 },
);

const getCachedActivePromotionsInner = unstable_cache(
  fetchActivePromotions,
  ["storefront", "promotions"],
  { tags: ["promotions"], revalidate: 180 },
);

export async function getCachedCatalogPages() {
  return getCachedCatalogPagesInner();
}

export async function getCachedFilterMeta(catalogPage: string) {
  return getCachedFilterMetaInner(catalogPage);
}

export async function getCachedProducts(query: Record<string, string>) {
  const queryKey = normalizeProductsQueryKey(query);
  const revalidate = isFilteredProductsQuery(queryKey) ? 60 : 120;
  const cached = unstable_cache(
    () => fetchProducts(queryKey),
    ["storefront", "catalog-products", queryKey],
    { tags: ["catalog-products"], revalidate },
  );
  return cached() as Promise<{ items?: unknown[]; total?: number }>;
}

export async function getCachedHomePageData() {
  return getCachedHomePageDataInner();
}

export async function getCachedActivePromotions() {
  return getCachedActivePromotionsInner();
}
