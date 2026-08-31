import { cache } from "react";
import { catalogPageLimit } from "@/features/catalog/catalog-constants";
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
import { manufacturerSlug } from "@/lib/factory-slug";
import { catalogPageFromQuery } from "@/lib/server/catalog-metadata";
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
  page: number;
  limit: number;
  manufacturerSlugSegment?: string;
};

const loadCatalogShell = cache(
  async (
    flatJson: string,
    catalogPageInput: string,
    manufacturerName: string,
  ): Promise<CatalogShellInitial> => {
    const flat = JSON.parse(flatJson) as Record<string, string>;
    const catalogPage = resolveCatalogPageSlug(catalogPageInput);
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

    if (manufacturerName) {
      filterState = {
        ...filterState,
        attrSelections: {
          ...filterState.attrSelections,
          manufacturer: [manufacturerName],
        },
      };
    }

    const page = catalogPageFromQuery(flat);
    const limit = catalogPageLimit(catalogPage, meta);
    const queryString = buildCatalogApiQuery(catalogPage, filterState);
    const productQuery = {
      ...catalogQueryObjectFromQueryString(queryString),
      page: String(page),
      limit: String(limit),
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
      page,
      limit,
      manufacturerSlugSegment: manufacturerName ? manufacturerSlug(manufacturerName) : undefined,
    };
  },
);

export async function getCatalogShell(
  searchParams: Record<string, string | string[] | undefined>,
  options: { catalogPage: string; manufacturerName?: string },
): Promise<CatalogShellInitial> {
  const flat = flattenSearchParams(searchParams);
  return loadCatalogShell(
    JSON.stringify(flat),
    options.catalogPage,
    options.manufacturerName?.trim() || "",
  );
}
