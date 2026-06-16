export type NumericRange = { min: string; max: string };

/** Снимок в sessionStorage при уходе в карточку товара. */
export type CatalogScrollPayload = {
  catalogPage?: string;
  scrollY?: unknown;
  loadedPages?: unknown;
  search?: string;
  sort?: string;
  categories?: string[];
  subcategories?: string[];
  attrSelections?: Record<string, string[]>;
  attrRanges?: Record<string, NumericRange>;
  priceRange?: NumericRange;
  onSale?: boolean;
};

/** Снимок состояния при уходе в карточку товара (читаем один раз в layout). */
export type CatalogReturnSnapshot = {
  catalogPage: string;
  scrollY: number;
  loadedPages: number;
  scrollApplied: boolean;
};

export type CatalogFilterState = {
  search: string;
  sort: string;
  categories: string[];
  subcategories: string[];
  attrSelections: Record<string, string[]>;
  attrRanges: Record<string, NumericRange>;
  priceRange: NumericRange;
  onSale: boolean;
};
