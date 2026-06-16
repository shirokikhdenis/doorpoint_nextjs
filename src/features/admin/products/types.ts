export type AttributeDef = {
  id: number;
  code: string;
  name: string;
  type: string;
  isFilterable?: boolean;
  isVariantAxis?: boolean;
  options?: Array<string | { value: string }>;
};

export type CategoryRef = { id: number; name: string };
export type SubcategoryRef = { id: number; categoryId: number; name: string };

export type ProductRow = {
  id: number;
  sku: string;
  name: string;
  slug?: string | null;
  price: number;
  isOnSale: boolean;
  compareAtPrice: number | null;
  modelKey: string | null;
  category: string;
  subcategory: string;
  isActive: boolean;
  displayOrder: number;
  badges: string[];
  attributes: Record<string, string | number | boolean | null>;
  variantsCount: number;
  imagesCount: number;
  primaryImageUrl: string;
  imageUrls: string[];
};

export type SaleSettings = {
  mode: "minus_percent" | "plus_percent";
  percent: number;
};

export type ProductsTableResponse = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  manufacturers: string[];
  attributes: AttributeDef[];
  categories: CategoryRef[];
  subcategories: SubcategoryRef[];
  rows: ProductRow[];
  saleSettings?: SaleSettings;
  saleRuleDescription?: string;
};

export type HitFilter = "" | "yes" | "no";
export type SaleFilter = "" | "yes" | "no";

export type FixedColumnKey =
  | "order"
  | "id"
  | "sku"
  | "name"
  | "category"
  | "subcategory"
  | "price"
  | "compareAtPrice"
  | "hit"
  | "sale"
  | "active"
  | "variants"
  | "images"
  | "modelKey"
  | "photos";

export type ColumnVisibility = Record<FixedColumnKey, boolean> & { attributes: boolean };

export type BulkAction = "setHit" | "clearHit" | "setSale" | "clearSale";
