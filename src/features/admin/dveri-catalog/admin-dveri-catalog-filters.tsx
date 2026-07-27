"use client";

import { AdminInputField, AdminSelectField } from "@/features/admin/ui/admin-form-field";
import { PAGE_SIZE_OPTIONS, SORT_OPTIONS } from "./constants";
import type { DveriCatalogCategory, DveriCatalogTrademark, DveriSortKey } from "./types";

type AdminDveriCatalogFiltersProps = {
  categories: DveriCatalogCategory[];
  trademarks: DveriCatalogTrademark[];
  categoryId: number | null;
  trademarkId: number | null;
  search: string;
  sort: DveriSortKey;
  pageSize: number;
  onCategoryChange: (value: number | null) => void;
  onTrademarkChange: (value: number | null) => void;
  onSearchChange: (value: string) => void;
  onSortChange: (value: DveriSortKey) => void;
  onPageSizeChange: (value: number) => void;
};

export function AdminDveriCatalogFilters({
  categories,
  trademarks,
  categoryId,
  trademarkId,
  search,
  sort,
  pageSize,
  onCategoryChange,
  onTrademarkChange,
  onSearchChange,
  onSortChange,
  onPageSizeChange,
}: AdminDveriCatalogFiltersProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <AdminInputField
        id="dveri-search"
        label="Поиск"
        placeholder="Название или артикул"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />

      <AdminSelectField
        id="dveri-category"
        label="Категория"
        value={categoryId != null ? String(categoryId) : ""}
        onChange={(e) => onCategoryChange(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">Все категории</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.path}
          </option>
        ))}
      </AdminSelectField>

      <AdminSelectField
        id="dveri-trademark"
        label="Бренд"
        value={trademarkId != null ? String(trademarkId) : ""}
        onChange={(e) => onTrademarkChange(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">Все бренды</option>
        {trademarks.map((tm) => (
          <option key={tm.id} value={tm.id}>
            {tm.title}
          </option>
        ))}
      </AdminSelectField>

      <AdminSelectField
        id="dveri-sort"
        label="Сортировка"
        value={sort}
        onChange={(e) => onSortChange(e.target.value as DveriSortKey)}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </AdminSelectField>

      <AdminSelectField
        id="dveri-page-size"
        label="На странице"
        value={String(pageSize)}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
      >
        {PAGE_SIZE_OPTIONS.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </AdminSelectField>
    </div>
  );
}
