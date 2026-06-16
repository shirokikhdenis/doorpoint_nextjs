"use client";

import { useEffect, useState } from "react";
import type { AttributeDef, HitFilter, SaleFilter } from "./types";
import { LIMIT_OPTIONS } from "./constants";

type ActiveFilterChip = {
  key: string;
  label: string;
  onRemove: () => void;
};

type AdminProductsFiltersProps = {
  loading: boolean;
  total: number | null;
  categories: Array<{ id: number; name: string }>;
  subcategories: Array<{ id: number; categoryId: number; name: string }>;
  manufacturers: string[];
  productAttributes: AttributeDef[];
  search: string;
  onSearchChange: (value: string) => void;
  categoryId: number;
  onCategoryChange: (value: number) => void;
  subcategoryId: number;
  onSubcategoryChange: (value: number) => void;
  manufacturer: string;
  onManufacturerChange: (value: string) => void;
  hitFilter: HitFilter;
  onHitFilterChange: (value: HitFilter) => void;
  saleFilter: SaleFilter;
  onSaleFilterChange: (value: SaleFilter) => void;
  limit: number;
  onLimitChange: (value: number) => void;
  attrCode: string;
  onAttrCodeChange: (value: string) => void;
  attrValue: string;
  onAttrValueChange: (value: string) => void;
  attrValueOptions: string[];
  attrValueOptionsLoading: boolean;
  onSubmit: (event: React.FormEvent) => void;
  onReset: () => void;
  activeChips: ActiveFilterChip[];
  deleting: boolean;
  onDeleteByCategory: () => void;
  onDeleteAll: () => void;
  canDeleteByCategory: boolean;
};

const fieldClass =
  "rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm text-zinc-900 shadow-sm focus:border-zinc-400 focus:outline-none";
const labelClass = "text-[11px] font-medium uppercase tracking-wide text-zinc-500";

export function AdminProductsFilters({
  loading,
  total,
  categories,
  subcategories,
  manufacturers,
  productAttributes,
  search,
  onSearchChange,
  categoryId,
  onCategoryChange,
  subcategoryId,
  onSubcategoryChange,
  manufacturer,
  onManufacturerChange,
  hitFilter,
  onHitFilterChange,
  saleFilter,
  onSaleFilterChange,
  limit,
  onLimitChange,
  attrCode,
  onAttrCodeChange,
  attrValue,
  onAttrValueChange,
  attrValueOptions,
  attrValueOptionsLoading,
  onSubmit,
  onReset,
  activeChips,
  deleting,
  onDeleteByCategory,
  onDeleteAll,
  canDeleteByCategory,
}: AdminProductsFiltersProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [dangerOpen, setDangerOpen] = useState(false);

  const visibleSubcategories = categoryId
    ? subcategories.filter((sub) => sub.categoryId === categoryId)
    : subcategories;

  useEffect(() => {
    if (attrCode || manufacturer) setAdvancedOpen(true);
  }, [attrCode, manufacturer]);

  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-white shadow-sm">
      <form onSubmit={onSubmit} className="space-y-3 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-zinc-900">Фильтры</p>
            {total != null ? (
              <p className="mt-0.5 text-xs text-zinc-500">
                Найдено: <span className="font-semibold text-zinc-800">{total}</span> товаров
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Загрузка…" : "Применить"}
            </button>
            <button
              type="button"
              onClick={onReset}
              className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              Сбросить
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="flex flex-col gap-1 md:col-span-2 xl:col-span-2">
            <span className={labelClass}>Поиск</span>
            <input
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="SKU или название, например BRAVO"
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Категория</span>
            <select
              value={categoryId}
              onChange={(event) => onCategoryChange(Number(event.target.value))}
              className={fieldClass}
            >
              <option value={0}>Все</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Подкатегория</span>
            <select
              value={subcategoryId}
              onChange={(event) => onSubcategoryChange(Number(event.target.value))}
              className={fieldClass}
              disabled={!categoryId}
            >
              <option value={0}>Все</option>
              {visibleSubcategories.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Хит</span>
            <select
              value={hitFilter}
              onChange={(event) => onHitFilterChange(event.target.value as HitFilter)}
              className={fieldClass}
            >
              <option value="">Все</option>
              <option value="yes">Только хиты</option>
              <option value="no">Без хита</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Акция</span>
            <select
              value={saleFilter}
              onChange={(event) => onSaleFilterChange(event.target.value as SaleFilter)}
              className={fieldClass}
            >
              <option value="">Все</option>
              <option value="yes">Только акционные</option>
              <option value="no">Без акции</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>На странице</span>
            <select
              value={limit}
              onChange={(event) => onLimitChange(Number(event.target.value))}
              className={fieldClass}
            >
              {LIMIT_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="button"
          onClick={() => setAdvancedOpen((open) => !open)}
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
        >
          {advancedOpen ? "▾ Скрыть расширенные фильтры" : "▸ Расширенные фильтры"}
        </button>

        {advancedOpen ? (
          <div className="grid gap-3 rounded-lg border border-zinc-100 bg-zinc-50 p-3 md:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className={labelClass}>Производитель</span>
              <select
                value={manufacturer}
                onChange={(event) => onManufacturerChange(event.target.value)}
                className={fieldClass}
              >
                <option value="">Все</option>
                {manufacturers.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelClass}>Характеристика</span>
              <select
                value={attrCode}
                onChange={(event) => onAttrCodeChange(event.target.value)}
                className={fieldClass}
              >
                <option value="">Все</option>
                {productAttributes.map((attribute) => (
                  <option key={attribute.id} value={attribute.code}>
                    {attribute.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelClass}>Значение</span>
              {attrCode && attrValueOptions.length > 0 ? (
                <select
                  value={attrValue}
                  onChange={(event) => onAttrValueChange(event.target.value)}
                  disabled={attrValueOptionsLoading}
                  className={fieldClass}
                >
                  <option value="">Любое</option>
                  {attrValueOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="search"
                  value={attrValue}
                  onChange={(event) => onAttrValueChange(event.target.value)}
                  disabled={!attrCode || attrValueOptionsLoading}
                  placeholder={
                    !attrCode
                      ? "Сначала характеристика"
                      : attrValueOptionsLoading
                        ? "Загрузка…"
                        : "Часть значения"
                  }
                  className={fieldClass}
                />
              )}
            </label>
          </div>
        ) : null}
      </form>

      {activeChips.length > 0 ? (
        <div className="flex flex-wrap gap-2 border-t border-zinc-100 px-4 py-3">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onRemove}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
            >
              {chip.label}
              <span aria-hidden className="text-zinc-400">
                ×
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="border-t border-zinc-100 px-4 py-3">
        <button
          type="button"
          onClick={() => setDangerOpen((open) => !open)}
          className="text-xs font-medium text-rose-700 hover:text-rose-900"
        >
          {dangerOpen ? "▾ Скрыть опасные действия" : "▸ Опасные действия"}
        </button>
        {dangerOpen ? (
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onDeleteByCategory}
              disabled={deleting || !canDeleteByCategory}
              className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? "Удаляем…" : "Удалить товары категории"}
            </button>
            <button
              type="button"
              onClick={onDeleteAll}
              disabled={deleting || total === 0}
              className="rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? "Удаляем…" : "Удалить все товары"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
