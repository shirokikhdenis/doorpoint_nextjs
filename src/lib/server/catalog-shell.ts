import { CATALOG_PAGE_LIMIT } from "@/features/catalog/catalog-constants";
import {
  applyLabelToSelections,
  buildCatalogApiQuery,
  catalogQueryObjectFromQueryString,
  flattenSearchParams,
  parseCatalogFilterStateFromSearchParams,
} from "@/features/catalog/catalog-filter-utils";
import type { CatalogFilterState } from "@/features/catalog/catalog-types";
import {
  normalizeCatalogMeta,
  normalizeCatalogPages,
  normalizeProductsResponse,
  type CatalogMeta,
  type CatalogPageItem,
  type ProductCard,
} from "@/lib/client/normalizers";
import { resolveCatalogPageSlug } from "@/lib/catalog-page-slugs";
import {
  getCachedCatalogPages,
  getCachedFilterMeta,
  getCachedProducts,
} from "@/lib/server/cache/storefront-cache";

export type CatalogShellInitial = {
  catalogPages: CatalogPageItem[];
  meta: CatalogMeta;
  products: ProductCard[];
  total: number;
  catalogPage: string;
  queryString: string;
  filterState: CatalogFilterState;
};

export async function getCatalogShell(
  searchParams: Record<string, string | string[] | undefined>,
  options: { catalogPage: string },
): Promise<CatalogShellInitial> {
  const flat = flattenSearchParams(searchParams);
  const catalogPage = resolveCatalogPageSlug(options.catalogPage);
  let filterState = parseCatalogFilterStateFromSearchParams(flat);

  const metaRaw = await getCachedFilterMeta(catalogPage);
  const meta = normalizeCatalogMeta(metaRaw);

  if (flat.catalogLabel) {
    const labelId = Number(flat.catalogLabel);
    const label = meta.labels.find((entry) => entry.id === labelId);
    if (label) {
      filterState = {
        ...filterState,
        attrSelections: applyLabelToSelections(label),
        attrRanges: {},
      };
    }
  }

  const queryString = buildCatalogApiQuery(catalogPage, filterState);
  const productQuery = {
    ...catalogQueryObjectFromQueryString(queryString),
    page: "1",
    limit: String(CATALOG_PAGE_LIMIT),
  };

  const [catalogPagesRaw, productsRaw] = await Promise.all([
    getCachedCatalogPages(),
    getCachedProducts(productQuery),
  ]);

  return {
    catalogPages: normalizeCatalogPages(catalogPagesRaw),
    meta,
    products: normalizeProductsResponse(productsRaw),
    total: Number(productsRaw?.total) || 0,
    catalogPage,
    queryString,
    filterState,
  };
}
