import type { CatalogFilterState } from "@/features/catalog/catalog-types";
import type { ProductCard } from "@/lib/client/normalizers";

export type CatalogReturnPayload = {
  catalogPage: string;
  scrollY: number;
  loadedPages: number;
  searchKey: string;
  returnHref: string;
  /** Snapshot of filters at click time — URL may lag behind router.replace. */
  filterState?: CatalogFilterState;
};

export type CatalogSessionStatus =
  | "idle"
  | "loading"
  | "loading_more"
  | "restoring"
  | "error";

export type CatalogRestoreTarget = {
  catalogPage: string;
  scrollY: number;
  loadedPages: number;
  searchKey: string;
};

export type CatalogSessionState = {
  catalogPage: string;
  searchKey: string;
  products: ProductCard[];
  total: number;
  page: number;
  status: CatalogSessionStatus;
  error: string;
  restore: CatalogRestoreTarget | null;
  restoreScrollApplied: boolean;
};

export type CatalogSessionAction =
  | {
      type: "INIT_FROM_SHELL";
      catalogPage: string;
      searchKey: string;
      products: ProductCard[];
      total: number;
    }
  | { type: "USER_FILTER_CHANGE"; searchKey: string }
  | { type: "VITRINE_CHANGE"; catalogPage: string; searchKey: string }
  | { type: "LOAD_MORE" }
  | { type: "FETCH_START"; page: number }
  | {
      type: "FETCH_SUCCESS";
      page: number;
      searchKey: string;
      products: ProductCard[];
      total: number;
      append: boolean;
    }
  | { type: "FETCH_ERROR"; message: string }
  | { type: "RESTORE_BEGIN"; restore: CatalogRestoreTarget }
  | {
      type: "RESTORE_PAGES_LOADED";
      products: ProductCard[];
      total: number;
      page: number;
      searchKey: string;
    }
  | { type: "RESTORE_SCROLL_APPLIED" };

export const createInitialCatalogSessionState = (
  catalogPage: string,
  searchKey: string,
): CatalogSessionState => ({
  catalogPage,
  searchKey,
  products: [],
  total: 0,
  page: 1,
  status: "loading",
  error: "",
  restore: null,
  restoreScrollApplied: false,
});
