"use client";

import { AdminInputField, AdminSelectField } from "@/features/admin/ui/admin-form-field";
import {
  CATEGORY_OPTIONS,
  GROUP_BY_OPTIONS,
  PAGE_SIZE_OPTIONS,
  SORT_OPTIONS,
} from "./constants";
import { extractGroupFilterOptions, getGroupLabel } from "./exhibition-utils";
import type { ExhibitionDoorRow, ExhibitionMeta, GroupByKey, SortKey } from "./types";

type AdminExhibitionFiltersProps = {
  items: ExhibitionDoorRow[];
  manufacturers: string[];
  meta: ExhibitionMeta | null;
  categoryType: "" | "entry" | "interior";
  manufacturer: string;
  groupFilter: string;
  search: string;
  sort: SortKey;
  groupBy: GroupByKey;
  pageSize: number;
  onCategoryTypeChange: (value: "" | "entry" | "interior") => void;
  onManufacturerChange: (value: string) => void;
  onGroupFilterChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onSortChange: (value: SortKey) => void;
  onGroupByChange: (value: GroupByKey) => void;
  onPageSizeChange: (value: number) => void;
};

export function AdminExhibitionFilters({
  items,
  manufacturers,
  meta,
  categoryType,
  manufacturer,
  groupFilter,
  search,
  sort,
  groupBy,
  pageSize,
  onCategoryTypeChange,
  onManufacturerChange,
  onGroupFilterChange,
  onSearchChange,
  onSortChange,
  onGroupByChange,
  onPageSizeChange,
}: AdminExhibitionFiltersProps) {
  const groupOptions = extractGroupFilterOptions(items, groupBy, meta ?? undefined);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <AdminSelectField
        id="exhibition-category-filter"
        label="Категория"
        value={categoryType}
        onChange={(e) => onCategoryTypeChange(e.target.value as "" | "entry" | "interior")}
      >
        <option value="">Все категории</option>
        {CATEGORY_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </AdminSelectField>

      <AdminSelectField
        id="exhibition-manufacturer-filter"
        label="Фабрика"
        value={manufacturer}
        onChange={(e) => onManufacturerChange(e.target.value)}
      >
        <option value="">Все фабрики</option>
        {manufacturers.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </AdminSelectField>

      <AdminSelectField
        id="exhibition-group-filter"
        label="Показать группу"
        value={groupFilter}
        disabled={groupBy === "none"}
        onChange={(e) => onGroupFilterChange(e.target.value)}
      >
        <option value="">Все группы</option>
        {groupOptions.map((key) => (
          <option key={key} value={key}>
            {getGroupLabel(key, groupBy, meta ?? undefined)}
          </option>
        ))}
      </AdminSelectField>

      <AdminInputField
        id="exhibition-search"
        label="Поиск"
        placeholder="Наименование, цвет, фабрика…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />

      <AdminSelectField
        id="exhibition-sort"
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
        id="exhibition-group-by"
        label="Группировка"
        value={groupBy}
        onChange={(e) => onGroupByChange(e.target.value as GroupByKey)}
      >
        {GROUP_BY_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </AdminSelectField>

      <AdminSelectField
        id="exhibition-page-size"
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
