export const DEFAULT_GROUP = "Двери";
export const DEFAULT_WAREHOUSE = "Факт_Архангельск";
export const DEFAULT_SORT = "name-asc";
export const DEFAULT_PAGE_SIZE = 100;

export const PAGE_SIZE_OPTIONS = [50, 100, 200] as const;

export const SORT_OPTIONS = [
  { value: "stock-desc", label: "Остаток (больше → меньше)" },
  { value: "stock-asc", label: "Остаток (меньше → больше)" },
  { value: "price-desc", label: "Цена (дороже → дешевле)" },
  { value: "price-asc", label: "Цена (дешевле → дороже)" },
  { value: "name-asc", label: "Наименование (А → Я)" },
  { value: "name-desc", label: "Наименование (Я → А)" },
] as const;
