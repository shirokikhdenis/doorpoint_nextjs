import { createRequire } from "node:module";
import { CATALOG_PAGE_LIMIT } from "@/features/catalog/catalog-constants";
import {
  applyLabelToSelections,
  buildCatalogQuery,
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
import { isLegacyCatalogPageSlug, resolveCatalogPageSlug } from "@/lib/catalog-page-slugs";

const require = createRequire(import.meta.url);
const catalogService = require("@/lib/server/services/catalogService") as {
  listCatalogPages: () => Promise<unknown[]>;
  getFilterMeta: (query: { catalogPage: string }) => Promise<unknown>;
  getProducts: (query: Record<string, string>) => Promise<{
    items?: unknown[];
    total?: number;
  }>;
};

export type CatalogShellInitial = {
  catalogPages: CatalogPageItem[];
  meta: CatalogMeta;
  products: ProductCard[];
  total: number;
  catalogPage: string;
  queryString: string;
  filterState: CatalogFilterState;
  legacyCatalogPageRedirect?: string;
};

export async function getCatalogShell(
  searchParams: Record<string, string | string[] | undefined>,
): Promise<CatalogShellInitial> {
  const flat = flattenSearchParams(searchParams);
  const rawCatalogPage = flat.catalogPage?.trim() || "all";
  const catalogPage = resolveCatalogPageSlug(rawCatalogPage);
  let filterState = parseCatalogFilterStateFromSearchParams(flat);

  const metaRaw = await catalogService.getFilterMeta({ catalogPage });
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

  const queryString = buildCatalogQuery(catalogPage, filterState);
  const legacyCatalogPageRedirect =
    rawCatalogPage !== catalogPage && isLegacyCatalogPageSlug(rawCatalogPage)
      ? queryString
      : undefined;
  const productQuery = {
    ...catalogQueryObjectFromQueryString(queryString),
    page: "1",
    limit: String(CATALOG_PAGE_LIMIT),
  };

  const [catalogPagesRaw, productsRaw] = await Promise.all([
    catalogService.listCatalogPages(),
    catalogService.getProducts(productQuery),
  ]);

  return {
    catalogPages: normalizeCatalogPages(catalogPagesRaw),
    meta,
    products: normalizeProductsResponse(productsRaw),
    total: Number(productsRaw?.total) || 0,
    catalogPage,
    queryString,
    filterState,
    legacyCatalogPageRedirect,
  };
}

