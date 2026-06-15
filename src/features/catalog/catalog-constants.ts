import type { CatalogMeta } from "@/lib/client/normalizers";

export const CATALOG_PAGE_LIMIT = 20;

export const CATALOG_CARD_IMAGE_HEIGHT = "h-[240px] sm:h-[320px] lg:h-[360px]";

export const emptyCatalogMeta: CatalogMeta = {
  categories: [],
  subcategories: [],
  attributeFilters: [],
  price: { min: 0, max: 0 },
  labels: [],
};
