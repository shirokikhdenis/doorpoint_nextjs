import type { CatalogMeta } from "@/lib/client/normalizers";
import { CATALOG_PAGE_SLUG, resolveCatalogPageSlug } from "@/lib/catalog-page-slugs";

export const CATALOG_PAGE_LIMIT = 20;
/** Витрина фурнитуры: 6 карточек в ряд × 4 ряда до «Показать ещё». */
export const CATALOG_FITTINGS_PAGE_LIMIT = 24;

export function catalogPageLimit(catalogPage?: string) {
  return resolveCatalogPageSlug(catalogPage ?? "") === CATALOG_PAGE_SLUG.fittings
    ? CATALOG_FITTINGS_PAGE_LIMIT
    : CATALOG_PAGE_LIMIT;
}

export const CATALOG_CARD_IMAGE_HEIGHT = "h-[240px] sm:h-[320px] lg:h-[360px]";

export const emptyCatalogMeta: CatalogMeta = {
  categories: [],
  subcategories: [],
  attributeFilters: [],
  price: { min: 0, max: 0 },
  labels: [],
  collapsedFilterSections: null,
};
