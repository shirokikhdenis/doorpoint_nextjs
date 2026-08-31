export type ExhibitionCategoryType = "entry" | "interior";

export type ExhibitionAccessory = {
  id: number;
  name: string;
  sku: string;
  price: number;
  category: string;
};

export type ExhibitionDoorRow = {
  id: number;
  categoryType: ExhibitionCategoryType;
  productId: number | null;
  productSlug: string | null;
  productName: string;
  productSku: string;
  coatingColor: string;
  coatingType: string;
  manufacturerName: string;
  accessories: ExhibitionAccessory[];
  price: number | null;
  kitPrice: number | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ExhibitionMeta = {
  categoryIds: {
    entry: number | null;
    interior: number | null;
  };
  categoryLabels: {
    entry: string;
    interior: string;
  };
};

export type ExhibitionListResponse = {
  items: ExhibitionDoorRow[];
  manufacturers: string[];
  meta: ExhibitionMeta;
};

export type GroupByKey = "none" | "category" | "manufacturer";

export type SortKey =
  | "name-asc"
  | "name-desc"
  | "manufacturer-asc"
  | "manufacturer-desc"
  | "price-asc"
  | "price-desc"
  | "kitPrice-asc"
  | "kitPrice-desc";

export type ExhibitionFilters = {
  categoryType: "" | ExhibitionCategoryType;
  manufacturer: string;
  groupFilter: string;
  search: string;
  sort: SortKey;
  groupBy: GroupByKey;
};

export type ExhibitionTableSection = {
  key: string;
  label: string;
  rows: ExhibitionDoorRow[];
};

export type ProductPreviewResponse = {
  product: {
    id: number;
    name: string;
    sku: string;
    price: number;
    categorySlug: string;
    subcategory: string;
  };
  manufacturerName: string;
  price: number;
  kitPrice: number | null;
  accessories: ExhibitionAccessory[];
  defaultCoatingColor: string;
  colorOptions: string[];
  manufacturers: string[];
  snapshot: {
    productId: number;
    productName: string;
    productSku: string;
    manufacturerName: string;
    coatingColor: string;
    coatingType: string;
    price: number;
    kitPrice: number | null;
    accessories: ExhibitionAccessory[];
  };
};

export type ExhibitionFormState = {
  categoryType: ExhibitionCategoryType;
  productId: number | null;
  productName: string;
  productSku: string;
  coatingColor: string;
  coatingType: string;
  manufacturerName: string;
  accessories: ExhibitionAccessory[];
  price: number | null;
  kitPrice: number | null;
  sortOrder: number;
};

export type ProductSearchRow = {
  id: number;
  name: string;
  sku: string;
  primaryImageUrl?: string;
  color?: string | null;
  glass?: string | null;
  manufacturer?: string | null;
};
