"use client";

import { AdminInputField, AdminSelectField } from "@/features/admin/ui/admin-form-field";
import { PAGE_SIZE_OPTIONS, SORT_OPTIONS } from "./constants";
import type { SortKey } from "./types";

type AdminPrometStockFiltersProps = {
  groups: string[];
  warehouses: string[];
  group: string;
  warehouseCol: string;
  search: string;
  onlyInStock: boolean;
  sort: SortKey;
  pageSize: number;
  onGroupChange: (value: string) => void;
  onWarehouseChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onOnlyInStockChange: (value: boolean) => void;
  onSortChange: (value: SortKey) => void;
  onPageSizeChange: (value: number) => void;
};

export function AdminPrometStockFilters({
  groups,
  warehouses,
  group,
  warehouseCol,
  search,
  onlyInStock,
  sort,
  pageSize,
  onGroupChange,
  onWarehouseChange,
  onSearchChange,
  onOnlyInStockChange,
  onSortChange,
  onPageSizeChange,
}: AdminPrometStockFiltersProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <AdminSelectField
        id="promet-group"
        label="Группа"
        value={group}
        onChange={(e) => onGroupChange(e.target.value)}
      >
        <option value="">Все группы</option>
        {groups.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </AdminSelectField>

      <AdminSelectField
        id="promet-warehouse"
        label="Склад"
        value={warehouseCol}
        onChange={(e) => onWarehouseChange(e.target.value)}
      >
        <option value="">Все склады (Факт)</option>
        {warehouses.map((col) => (
          <option key={col} value={col}>
            {col.replace(/^Факт_/, "")}
          </option>
        ))}
      </AdminSelectField>

      <AdminInputField
        id="promet-search"
        label="Поиск"
        placeholder="Артикул или наименование"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />

      <label className="flex items-center gap-2 text-sm text-admin-text-secondary sm:col-span-2 lg:col-span-1">
        <input
          type="checkbox"
          checked={onlyInStock}
          onChange={(e) => onOnlyInStockChange(e.target.checked)}
          className="size-4 rounded border-admin-input-border"
        />
        Только в наличии
      </label>

      <AdminSelectField
        id="promet-sort"
        label="Сортировка"
        value={sort}
        onChange={(e) => onSortChange(e.target.value as SortKey)}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </AdminSelectField>

      <AdminSelectField
        id="promet-page-size"
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
