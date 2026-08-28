export type DveriCatalogOption = {
  id: number;
  title: string;
  vendorCode: string;
  price: number;
  priceDealer: number;
  discount: number;
  discountDealer: number;
  priceFinal: number;
  priceDealerFinal: number;
  label: string | null;
};

export type DveriCatalogProduct = {
  id: number;
  title: string;
  url: string;
  categoryId: number | null;
  categoryPath: string;
  trademarkId: number | null;
  trademark: string;
  color: string;
  glass: string;
  vendorCode: string;
  price: number;
  priceDealer: number;
  discount: number;
  discountDealer: number;
  priceFinal: number;
  priceDealerFinal: number;
  label: string | null;
  pictureSmall: string | null;
  options: DveriCatalogOption[];
  optionCount: number;
};

export type DveriCatalogCategory = {
  id: number;
  title: string;
  parentId: number | null;
  path: string;
};

export type DveriCatalogTrademark = {
  id: number;
  title: string;
};

export type DveriCatalogStats = {
  productCount: number;
  categoryCount: number;
  trademarkCount: number;
  withOptionsCount: number;
};

export type DveriCatalogResponse = {
  city: string;
  cityLabel: string;
  categories: DveriCatalogCategory[];
  trademarks: DveriCatalogTrademark[];
  products: DveriCatalogProduct[];
  stats: DveriCatalogStats;
  /** vendor_code → цена на витрине (по variant_attr:manufacturer_id) */
  storefrontPrices?: Record<string, number>;
  cached?: boolean;
  fetchedAt?: string;
  message?: string;
  error?: string;
};

export type DveriSortKey = "name-asc" | "name-desc" | "price-asc" | "price-desc" | "vendor-asc" | "vendor-desc";

export type DveriCatalogFilters = {
  categoryId: number | null;
  trademarkId: number | null;
  search: string;
  sort: DveriSortKey;
};

/** Параметры формулы: опт × multiplier → округление вверх → ± adjustment */
export type DveriCategoryPricingRule = {
  multiplier: number;
  /** null или 0 — без округления; иначе шаг (10, 100, 1000…) */
  roundUpTo: number | null;
  adjustment: number;
};

export type DveriPricingRulesState = {
  defaultRule: DveriCategoryPricingRule;
  /** categoryId → правило (переопределяет default для этой категории и потомков без своего) */
  categoryRules: Record<string, DveriCategoryPricingRule>;
};

export type DveriPriceReconcileStatus = "match" | "storefront_lower" | "storefront_higher";

export type DveriPriceReconcileRow = {
  productId: number;
  productTitle: string;
  vendorCode: string;
  optionTitle: string | null;
  categoryPath: string;
  dealerPrice: number;
  calculatedPrice: number;
  storefrontPrice: number;
  diff: number;
  status: DveriPriceReconcileStatus;
};

export type DveriPriceReconcileReport = {
  categoryId: number;
  categoryTitle: string;
  totalCompared: number;
  matchCount: number;
  storefrontLowerCount: number;
  storefrontHigherCount: number;
  skippedNoStorefront: number;
  skippedNoCalculated: number;
  matches: DveriPriceReconcileRow[];
  storefrontLower: DveriPriceReconcileRow[];
  storefrontHigher: DveriPriceReconcileRow[];
};
