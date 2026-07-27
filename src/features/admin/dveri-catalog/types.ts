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
