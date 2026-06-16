import type { ColumnVisibility, FixedColumnKey } from "./types";

export const LIMIT_OPTIONS = [50, 100, 200, 500] as const;

export const COLUMN_LABELS: Record<FixedColumnKey, string> = {
  order: "Порядок",
  id: "ID",
  sku: "SKU",
  name: "Название",
  category: "Категория",
  subcategory: "Подкатегория",
  price: "Цена",
  compareAtPrice: "Старая цена",
  hit: "Хит",
  sale: "Акция",
  active: "Активен",
  variants: "Вариантов",
  images: "Картинок",
  modelKey: "model_key",
  photos: "Фото",
};

export const COLUMN_GROUPS: Array<{
  id: string;
  label: string;
  columns: FixedColumnKey[];
}> = [
  { id: "core", label: "Основное", columns: ["order", "id", "sku", "name"] },
  { id: "taxonomy", label: "Категории", columns: ["category", "subcategory"] },
  {
    id: "commerce",
    label: "Цены и статусы",
    columns: ["price", "compareAtPrice", "hit", "sale", "active"],
  },
  { id: "counts", label: "Счётчики", columns: ["variants", "images", "modelKey"] },
  { id: "media", label: "Медиа", columns: ["photos"] },
];

export const DEFAULT_COLUMN_VISIBILITY: ColumnVisibility = {
  order: true,
  id: true,
  sku: true,
  name: true,
  category: true,
  subcategory: true,
  price: true,
  compareAtPrice: true,
  hit: true,
  sale: true,
  active: true,
  variants: true,
  images: true,
  modelKey: false,
  photos: false,
  attributes: false,
};

export const COLUMN_VISIBILITY_STORAGE_KEY = "admin-products-column-visibility";
