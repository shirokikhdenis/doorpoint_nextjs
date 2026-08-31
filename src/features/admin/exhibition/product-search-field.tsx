"use client";

import { useEffect, useState } from "react";
import { formatProductSearchLabel, mapApiRowToProductSearch } from "./exhibition-utils";
import type { ExhibitionCategoryType, ProductSearchRow } from "./types";

type ProductSearchFieldProps = {
  categoryType: ExhibitionCategoryType;
  categoryId: number | null;
  value: ProductSearchRow | null;
  onChange: (product: ProductSearchRow | null) => void;
  disabled?: boolean;
};

export function ProductSearchField({
  categoryType,
  categoryId,
  value,
  onChange,
  disabled = false,
}: ProductSearchFieldProps) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ProductSearchRow[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2 || !categoryId) {
      setResults([]);
      return;
    }

    const timer = window.setTimeout(() => {
      const run = async () => {
        setSearching(true);
        try {
          const params = new URLSearchParams({
            search: q,
            limit: "10",
            page: "1",
            categoryId: String(categoryId),
          });
          const response = await fetch(`/api/admin/products-table?${params.toString()}`);
          if (!response.ok) throw new Error("search failed");
          const json = (await response.json()) as {
            rows?: Array<{
              id: unknown;
              name: unknown;
              sku: unknown;
              primaryImageUrl?: unknown;
              attributes?: Record<string, unknown>;
            }>;
          };
          setResults(
            Array.isArray(json.rows) ? json.rows.map((row) => mapApiRowToProductSearch(row)) : [],
          );
        } catch {
          setResults([]);
        } finally {
          setSearching(false);
        }
      };
      void run();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search, categoryId]);

  return (
    <div className="space-y-2">
      {value ? (
        <div className="flex items-start justify-between gap-3 rounded border border-admin-border bg-admin-surface-muted px-3 py-2">
          <div className="min-w-0">
            <p className="truncate font-medium text-admin-text">
              {formatProductSearchLabel({ ...value, categoryType })}
            </p>
            <p className="text-xs text-admin-text-muted">{value.sku || "Без артикула"}</p>
          </div>
          <button
            type="button"
            disabled={disabled}
            className="shrink-0 text-xs text-red-700 hover:underline disabled:opacity-60"
            onClick={() => onChange(null)}
          >
            Сменить
          </button>
        </div>
      ) : (
        <>
          <input
            value={search}
            disabled={disabled || !categoryId}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              categoryId
                ? "Поиск товара по названию или артикулу…"
                : "Сначала выберите категорию"
            }
            className="w-full rounded border border-admin-border bg-admin-surface px-2 py-1.5 text-sm"
          />
          {!categoryId ? (
            <p className="text-xs text-admin-text-muted">
              Категория «{categoryType === "entry" ? "Входные" : "Межкомнатные"}» не найдена в
              каталоге.
            </p>
          ) : null}
          {searching ? <p className="text-xs text-admin-text-muted">Поиск…</p> : null}
          {results.length > 0 ? (
            <ul className="max-h-48 space-y-1 overflow-y-auto rounded border border-admin-border bg-admin-surface-muted p-1">
              {results.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-admin-surface disabled:opacity-60"
                    onClick={() => {
                      onChange(row);
                      setSearch("");
                      setResults([]);
                    }}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-admin-text">
                        {formatProductSearchLabel({ ...row, categoryType })}
                      </span>
                      <span className="text-xs text-admin-text-muted">{row.sku}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </div>
  );
}
