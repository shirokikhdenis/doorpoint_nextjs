import type { DveriSortKey } from "./types";

export const DEFAULT_SORT: DveriSortKey = "name-asc";
export const DEFAULT_PAGE_SIZE = 50;

export const PAGE_SIZE_OPTIONS = [50, 100, 200] as const;

export const SORT_OPTIONS = [
  { value: "name-asc", label: "Название (А → Я)" },
  { value: "name-desc", label: "Название (Я → А)" },
  { value: "price-asc", label: "Цена (дешевле → дороже)" },
  { value: "price-desc", label: "Цена (дороже → дешевле)" },
  { value: "vendor-asc", label: "Артикул (А → Я)" },
  { value: "vendor-desc", label: "Артикул (Я → А)" },
] as const;
