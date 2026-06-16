"use client";

import { useEffect, useRef, useState } from "react";
import { COLUMN_GROUPS, COLUMN_LABELS } from "./constants";
import { saveColumnVisibility } from "./column-visibility";
import type { BulkAction, ColumnVisibility, FixedColumnKey } from "./types";

type AdminProductsToolbarProps = {
  selectedCount: number;
  pageRowCount: number;
  allPageSelected: boolean;
  onToggleSelectAll: () => void;
  onClearSelection: () => void;
  columnVisibility: ColumnVisibility;
  onColumnVisibilityChange: (value: ColumnVisibility) => void;
  compact: boolean;
  onCompactChange: (value: boolean) => void;
  onBulkAction: (action: BulkAction) => void;
  bulkLoading: boolean;
  loading: boolean;
};

export function AdminProductsToolbar({
  selectedCount,
  pageRowCount,
  allPageSelected,
  onToggleSelectAll,
  onClearSelection,
  columnVisibility,
  onColumnVisibilityChange,
  compact,
  onCompactChange,
  onBulkAction,
  bulkLoading,
  loading,
}: AdminProductsToolbarProps) {
  const [columnsOpen, setColumnsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!columnsOpen || !panelRef.current) return;
      if (!panelRef.current.contains(event.target as Node)) setColumnsOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [columnsOpen]);

  const toggleColumn = (key: FixedColumnKey | "attributes") => {
    const next = { ...columnVisibility, [key]: !columnVisibility[key] };
    onColumnVisibilityChange(next);
    saveColumnVisibility(next);
  };

  const setGroup = (columns: FixedColumnKey[], visible: boolean) => {
    const next = { ...columnVisibility };
    columns.forEach((column) => {
      next[column] = visible;
    });
    onColumnVisibilityChange(next);
    saveColumnVisibility(next);
  };

  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={allPageSelected && pageRowCount > 0}
            disabled={pageRowCount === 0 || loading}
            onChange={onToggleSelectAll}
            className="h-4 w-4 rounded border-zinc-300"
          />
          Страница
        </label>
        {selectedCount > 0 ? (
          <>
            <span className="text-sm text-zinc-600">
              Выбрано: <strong>{selectedCount}</strong>
            </span>
            <button
              type="button"
              onClick={onClearSelection}
              className="text-xs text-zinc-500 hover:text-zinc-800"
            >
              Снять выделение
            </button>
            <span className="hidden h-4 w-px bg-zinc-200 sm:inline" />
            <button
              type="button"
              disabled={bulkLoading}
              onClick={() => onBulkAction("setHit")}
              className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs hover:bg-zinc-50 disabled:opacity-60"
            >
              + Хит
            </button>
            <button
              type="button"
              disabled={bulkLoading}
              onClick={() => onBulkAction("clearHit")}
              className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs hover:bg-zinc-50 disabled:opacity-60"
            >
              − Хит
            </button>
            <button
              type="button"
              disabled={bulkLoading}
              onClick={() => onBulkAction("setSale")}
              className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs hover:bg-zinc-50 disabled:opacity-60"
            >
              + Акция
            </button>
            <button
              type="button"
              disabled={bulkLoading}
              onClick={() => onBulkAction("clearSale")}
              className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs hover:bg-zinc-50 disabled:opacity-60"
            >
              − Акция
            </button>
          </>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onCompactChange(!compact)}
          className={`rounded-md border px-2.5 py-1 text-xs ${
            compact
              ? "border-zinc-900 bg-zinc-900 text-white"
              : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
          }`}
        >
          {compact ? "Компактно" : "С фото"}
        </button>

        <div className="relative" ref={panelRef}>
          <button
            type="button"
            onClick={() => setColumnsOpen((open) => !open)}
            className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
          >
            Колонки ▾
          </button>
          {columnsOpen ? (
            <div className="absolute right-0 z-30 mt-1 w-72 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Видимость колонок
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const next = { ...columnVisibility, attributes: true };
                    (Object.keys(COLUMN_LABELS) as FixedColumnKey[]).forEach((key) => {
                      next[key] = true;
                    });
                    onColumnVisibilityChange(next);
                    saveColumnVisibility(next);
                  }}
                  className="text-[11px] text-brand hover:underline"
                >
                  Все
                </button>
              </div>
              <div className="max-h-64 space-y-3 overflow-y-auto">
                {COLUMN_GROUPS.map((group) => (
                  <div key={group.id}>
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-xs font-medium text-zinc-700">{group.label}</p>
                      <div className="flex gap-2 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setGroup(group.columns, true)}
                          className="text-zinc-500 hover:text-zinc-800"
                        >
                          все
                        </button>
                        <button
                          type="button"
                          onClick={() => setGroup(group.columns, false)}
                          className="text-zinc-500 hover:text-zinc-800"
                        >
                          скрыть
                        </button>
                      </div>
                    </div>
                    <ul className="space-y-1">
                      {group.columns.map((column) => (
                        <li key={column}>
                          <label className="flex items-center gap-2 text-sm text-zinc-700">
                            <input
                              type="checkbox"
                              checked={columnVisibility[column]}
                              onChange={() => toggleColumn(column)}
                            />
                            {COLUMN_LABELS[column]}
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                <label className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={columnVisibility.attributes}
                    onChange={() => toggleColumn("attributes")}
                  />
                  Характеристики (все колонки)
                </label>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
