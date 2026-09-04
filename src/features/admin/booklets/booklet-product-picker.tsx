"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/client/format";
import { toPublicImageSrc } from "@/lib/client/image-src";
import type { BookletProduct } from "./types";

type ProductsTableRow = {
  id: unknown;
  name: unknown;
  sku: unknown;
  price?: unknown;
  primaryImageUrl?: unknown;
};

const mapRow = (row: ProductsTableRow): BookletProduct => ({
  id: Number(row.id),
  name: String(row.name ?? ""),
  sku: String(row.sku ?? ""),
  price: Number(row.price) || 0,
  primaryImageUrl: row.primaryImageUrl ? String(row.primaryImageUrl) : "",
});

type BookletProductPickerProps = {
  products: BookletProduct[];
  onChange: (
    next: BookletProduct[] | ((current: BookletProduct[]) => BookletProduct[]),
  ) => void;
  categoryId: number | null;
  categoryLabel: string;
  maxItems: number;
  disabled?: boolean;
};

export function BookletProductPicker({
  products,
  onChange,
  categoryId,
  categoryLabel,
  maxItems,
  disabled,
}: BookletProductPickerProps) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<BookletProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const atLimit = products.length >= maxItems;
  const selectedIds = new Set(products.map((item) => item.id));

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
            limit: "12",
            page: "1",
            categoryId: String(categoryId),
          });
          const response = await fetch(`/api/admin/products-table?${params.toString()}`);
          if (!response.ok) throw new Error("search failed");
          const json = (await response.json()) as { rows?: ProductsTableRow[] };
          setResults(Array.isArray(json.rows) ? json.rows.map(mapRow) : []);
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

  const query = search.trim();
  const visibleResults = query.length < 2 ? [] : results.filter((row) => !selectedIds.has(row.id));

  const addProduct = (row: BookletProduct) => {
    if (disabled || atLimit || selectedIds.has(row.id)) return;
    onChange((current) => (current.some((item) => item.id === row.id) ? current : [...current, row]));
    setSearch("");
    setResults([]);
  };

  const removeProduct = (id: number) => {
    onChange((current) => current.filter((item) => item.id !== id));
  };

  const moveProduct = (id: number, direction: -1 | 1) => {
    onChange((current) => {
      const index = current.findIndex((item) => item.id === id);
      if (index < 0) return current;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <input
        value={search}
        disabled={disabled || !categoryId || atLimit}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={
          !categoryId
            ? `Категория «${categoryLabel}» не найдена`
            : atLimit
              ? `Выбрано максимум (${maxItems})`
              : "Поиск по названию или артикулу…"
        }
        className="w-full rounded border border-admin-border bg-admin-surface px-2 py-1.5 text-sm"
      />
      {searching ? <p className="text-xs text-admin-text-muted">Поиск…</p> : null}
      {visibleResults.length > 0 ? (
        <ul className="max-h-48 space-y-1 overflow-y-auto rounded border border-admin-border bg-admin-surface-muted p-1">
          {visibleResults.map((row) => {
            const src = toPublicImageSrc(row.primaryImageUrl);
            return (
              <li key={row.id}>
                <button
                  type="button"
                  disabled={disabled || atLimit}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-admin-surface disabled:opacity-60"
                  onClick={() => addProduct(row)}
                >
                  {src ? (
                    <img src={src} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-admin-surface text-[10px] text-admin-text-muted">
                      нет
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-admin-text">{row.name}</span>
                    <span className="text-xs text-admin-text-muted">
                      {row.sku || "Без артикула"}
                      {row.price > 0 ? ` · от ${formatPrice(row.price)}` : ""}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {products.length > 0 ? (
        <ul className="space-y-2">
          {products.map((item, index) => {
            const src = toPublicImageSrc(item.primaryImageUrl);
            return (
              <li
                key={item.id}
                className="flex items-center gap-2 rounded border border-admin-border bg-admin-surface px-2 py-1.5"
              >
                {src ? (
                  <img src={src} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-admin-surface-muted text-[10px] text-admin-text-muted">
                    нет
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-admin-text">
                    {index + 1}. {item.name}
                  </p>
                  <p className="truncate text-xs text-admin-text-muted">{item.sku || "Без артикула"}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-0.5">
                  <button
                    type="button"
                    disabled={disabled || index === 0}
                    className="text-xs text-admin-text-muted hover:text-admin-text disabled:opacity-30"
                    onClick={() => moveProduct(item.id, -1)}
                    aria-label="Выше"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    disabled={disabled || index === products.length - 1}
                    className="text-xs text-admin-text-muted hover:text-admin-text disabled:opacity-30"
                    onClick={() => moveProduct(item.id, 1)}
                    aria-label="Ниже"
                  >
                    ▼
                  </button>
                </div>
                <button
                  type="button"
                  disabled={disabled}
                  className="shrink-0 text-xs text-red-700 hover:underline disabled:opacity-60"
                  onClick={() => removeProduct(item.id)}
                >
                  Убрать
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-admin-text-muted">
          Пока ничего не выбрано. До {maxItems} моделей. Первые модели попадают на обложку буклета.
        </p>
      )}
    </div>
  );
}
