import type { DveriCategoryPricingRule, DveriSortKey } from "./types";

export const DEFAULT_SORT: DveriSortKey = "name-asc";

export const DVERI_PRICING_RULES_STORAGE_KEY = "admin-dveri-catalog-pricing-rules-v1";

export const DEFAULT_DVERI_PRICING_RULE: DveriCategoryPricingRule = {
  multiplier: 1,
  roundUpTo: null,
  adjustment: 0,
};

export const DVERI_ROUND_UP_OPTIONS = [
  { value: "", label: "Без округления" },
  { value: "10", label: "До 10 ₽" },
  { value: "100", label: "До 100 ₽" },
  { value: "1000", label: "До 1 000 ₽" },
  { value: "10000", label: "До 10 000 ₽" },
] as const;
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
