import type { GroupByKey, SortKey } from "./types";

export const DEFAULT_SORT: SortKey = "name-asc";
export const DEFAULT_GROUP_BY: GroupByKey = "none";
export const DEFAULT_PAGE_SIZE = 50;

export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export const SORT_OPTIONS = [
  { value: "name-asc", label: "Наименование (А → Я)" },
  { value: "name-desc", label: "Наименование (Я → А)" },
  { value: "manufacturer-asc", label: "Фабрика (А → Я)" },
  { value: "manufacturer-desc", label: "Фабрика (Я → А)" },
  { value: "price-desc", label: "Цена (дороже → дешевле)" },
  { value: "price-asc", label: "Цена (дешевле → дороже)" },
  { value: "kitPrice-desc", label: "Цена комплекта (дороже → дешевле)" },
  { value: "kitPrice-asc", label: "Цена комплекта (дешевле → дороже)" },
] as const;

export const GROUP_BY_OPTIONS = [
  { value: "none", label: "Без группировки" },
  { value: "category", label: "По категории" },
  { value: "manufacturer", label: "По фабрике" },
] as const;

export const CATEGORY_OPTIONS = [
  { value: "entry", label: "Входные" },
  { value: "interior", label: "Межкомнатные" },
] as const;

export const CATEGORY_LABELS: Record<"entry" | "interior", string> = {
  entry: "Входные двери",
  interior: "Межкомнатные двери",
};
