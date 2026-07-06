export type PrometStockRow = Record<string, string | number | null | undefined>;

export type PrometStockResponse = {
  mode?: string;
  userName?: string;
  generatedAt?: string;
  count?: number;
  columns?: string[];
  data?: PrometStockRow[];
  cached?: boolean;
  fetchedAt?: string;
  error?: string;
  message?: string;
};

export type SortKey =
  | "stock-desc"
  | "stock-asc"
  | "price-desc"
  | "price-asc"
  | "name-asc"
  | "name-desc";

export type PrometStockFilters = {
  group: string;
  warehouseCol: string;
  search: string;
  onlyInStock: boolean;
  sort: SortKey;
};

export type WarehouseBreakdownItem = {
  name: string;
  col: string;
  stock: number;
};
