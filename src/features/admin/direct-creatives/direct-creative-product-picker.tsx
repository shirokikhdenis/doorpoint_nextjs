"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/client/format";
import { toPublicImageSrc } from "@/lib/client/image-src";
import {
  MAX_COLLAGE_PHOTOS,
  MAX_NAME_LEN,
  MAX_PRICE_LABEL_LEN,
  MAX_PRODUCTS,
  formatPriceFrom,
  formatPriceRub,
} from "@/lib/direct-creative-sizes";
import { fetchDirectCreativeColors } from "@/lib/client/admin-direct-creatives";
import type { DirectCreativeProduct } from "./types";

type ProductsTableRow = {
  id: unknown;
  name: unknown;
  sku: unknown;
  price?: unknown;
  isOnSale?: unknown;
  compareAtPrice?: unknown;
  primaryImageUrl?: unknown;
};

const catalogTextForRow = (row: {
  name: string;
  price: number;
  isOnSale: boolean;
  compareAtPrice: number | null;
}) => {
  const saleActive =
    row.isOnSale &&
    row.compareAtPrice != null &&
    Number.isFinite(row.compareAtPrice) &&
    row.compareAtPrice > row.price;
  return {
    title: row.name,
    priceLabel: formatPriceFrom(row.price),
    compareLabel: saleActive ? formatPriceRub(row.compareAtPrice) : "",
  };
};

const mapRow = (row: ProductsTableRow): DirectCreativeProduct => {
  const base = {
    id: Number(row.id),
    name: String(row.name ?? ""),
    sku: String(row.sku ?? ""),
    price: Number(row.price) || 0,
    isOnSale: row.isOnSale === true,
    compareAtPrice:
      row.compareAtPrice === null || row.compareAtPrice === undefined
        ? null
        : Number(row.compareAtPrice),
    primaryImageUrl: row.primaryImageUrl ? String(row.primaryImageUrl) : "",
  };
  return {
    ...base,
    ...catalogTextForRow(base),
    colorVariants: [],
    selectedPhotoIds: [base.id],
  };
};

type DirectCreativeProductPickerProps = {
  products: DirectCreativeProduct[];
  onChange: (
    next:
      | DirectCreativeProduct[]
      | ((current: DirectCreativeProduct[]) => DirectCreativeProduct[]),
  ) => void;
  disabled?: boolean;
};

export function DirectCreativeProductPicker({
  products,
  onChange,
  disabled,
}: DirectCreativeProductPickerProps) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<DirectCreativeProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const atLimit = products.length >= MAX_PRODUCTS;
  const selectedIds = new Set(products.map((item) => item.id));

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) return;

    const timer = window.setTimeout(() => {
      const run = async () => {
        setSearching(true);
        try {
          const params = new URLSearchParams({
            search: q,
            limit: "12",
            page: "1",
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
  }, [search]);

  const query = search.trim();
  const visibleResults = query.length < 2 ? [] : results;

  const addProduct = (row: DirectCreativeProduct) => {
    if (disabled || atLimit || selectedIds.has(row.id)) return;
    onChange((current) =>
      current.some((item) => item.id === row.id) ? current : [...current, row],
    );
    setSearch("");
    setResults([]);
    void (async () => {
      try {
        const colorVariants = await fetchDirectCreativeColors(row.id);
        onChange((current) =>
          current.map((item) =>
            item.id === row.id
              ? {
                  ...item,
                  colorVariants,
                  selectedPhotoIds: item.selectedPhotoIds.length
                    ? item.selectedPhotoIds
                    : [item.id],
                }
              : item,
          ),
        );
      } catch {
        /* варианты цветов опциональны */
      }
    })();
  };

  const removeProduct = (id: number) => {
    onChange((current) => current.filter((item) => item.id !== id));
  };

  const patchProduct = (id: number, patch: Partial<DirectCreativeProduct>) => {
    onChange((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const resetProductText = (item: DirectCreativeProduct) => {
    patchProduct(item.id, catalogTextForRow(item));
  };

  const togglePhoto = (item: DirectCreativeProduct, variantId: number) => {
    const current = item.selectedPhotoIds.length ? item.selectedPhotoIds : [item.id];
    const has = current.includes(variantId);
    if (has) {
      const next = current.filter((id) => id !== variantId);
      if (next.length === 0) return;
      patchProduct(item.id, { selectedPhotoIds: next });
      return;
    }
    if (current.length >= MAX_COLLAGE_PHOTOS) return;
    patchProduct(item.id, { selectedPhotoIds: [...current, variantId] });
  };

  const selectAllPhotos = (item: DirectCreativeProduct) => {
    const ids = item.colorVariants
      .map((entry) => entry.id)
      .filter((id) => Number.isInteger(id) && id > 0)
      .slice(0, MAX_COLLAGE_PHOTOS);
    patchProduct(item.id, { selectedPhotoIds: ids.length ? ids : [item.id] });
  };

  return (
    <div className="space-y-3">
      <input
        value={search}
        disabled={disabled || atLimit}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={
          atLimit
            ? `Выбрано максимум ${MAX_PRODUCTS} моделей`
            : "Поиск модели по названию или артикулу…"
        }
        className="w-full rounded border border-admin-border bg-admin-surface px-2 py-1.5 text-sm"
      />
      {searching && query.length >= 2 ? (
        <p className="text-xs text-admin-text-muted">Поиск…</p>
      ) : null}
      {visibleResults.length > 0 ? (
        <ul className="max-h-56 space-y-1 overflow-y-auto rounded border border-admin-border bg-admin-surface-muted p-1">
          {visibleResults.map((row) => {
            const added = selectedIds.has(row.id);
            const src = toPublicImageSrc(row.primaryImageUrl);
            return (
              <li key={row.id}>
                <button
                  type="button"
                  disabled={disabled || added || atLimit}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-admin-surface disabled:opacity-50"
                  onClick={() => addProduct(row)}
                >
                  {src ? (
                    <img src={src} alt="" className="h-10 w-8 shrink-0 object-cover" />
                  ) : (
                    <span className="flex h-10 w-8 shrink-0 items-center justify-center bg-admin-surface text-[10px] text-admin-text-muted">
                      нет
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-admin-text">{row.name}</span>
                    <span className="text-xs text-admin-text-muted">
                      {row.sku || "Без артикула"} · {formatPrice(row.price)}
                    </span>
                  </span>
                  {added ? (
                    <span className="shrink-0 text-xs text-admin-text-muted">уже в списке</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {products.length === 0 ? (
        <p className="text-sm text-admin-text-muted">Пока ничего не выбрано.</p>
      ) : (
        <ul className="space-y-2">
          {products.map((item) => {
            const src = toPublicImageSrc(item.primaryImageUrl);
            return (
              <li
                key={item.id}
                className="space-y-3 rounded border border-admin-border bg-admin-surface-muted px-3 py-3"
              >
                <div className="flex items-start gap-3">
                  {src ? (
                    <img src={src} alt="" className="h-12 w-9 shrink-0 object-cover" />
                  ) : (
                    <span className="flex h-12 w-9 shrink-0 items-center justify-center bg-admin-surface text-[10px] text-admin-text-muted">
                      нет фото
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-admin-text-muted">
                      {item.sku || "Без артикула"} · каталог {formatPrice(item.price)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-3">
                    <button
                      type="button"
                      disabled={disabled}
                      className="text-xs text-admin-text-secondary hover:underline disabled:opacity-60"
                      onClick={() => resetProductText(item)}
                    >
                      Как в каталоге
                    </button>
                    <button
                      type="button"
                      disabled={disabled}
                      className="text-xs text-red-700 hover:underline disabled:opacity-60"
                      onClick={() => removeProduct(item.id)}
                    >
                      Убрать
                    </button>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="block space-y-1 sm:col-span-2">
                    <span className="text-xs text-admin-text-muted">Название на баннере</span>
                    <input
                      value={item.title}
                      maxLength={MAX_NAME_LEN}
                      disabled={disabled}
                      onChange={(event) => patchProduct(item.id, { title: event.target.value })}
                      className="w-full rounded border border-admin-border bg-admin-surface px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs text-admin-text-muted">Цена</span>
                    <input
                      value={item.priceLabel}
                      maxLength={MAX_PRICE_LABEL_LEN}
                      disabled={disabled}
                      onChange={(event) =>
                        patchProduct(item.id, { priceLabel: event.target.value })
                      }
                      className="w-full rounded border border-admin-border bg-admin-surface px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs text-admin-text-muted">Старая цена</span>
                    <input
                      value={item.compareLabel}
                      maxLength={MAX_PRICE_LABEL_LEN}
                      disabled={disabled}
                      placeholder="не показывать"
                      onChange={(event) =>
                        patchProduct(item.id, { compareLabel: event.target.value })
                      }
                      className="w-full rounded border border-admin-border bg-admin-surface px-2 py-1.5 text-sm"
                    />
                  </label>
                </div>
                {(item.colorVariants ?? []).length > 1 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-admin-text-muted">
                        Цвета на карточке ({item.selectedPhotoIds.length} из {MAX_COLLAGE_PHOTOS})
                      </span>
                      <button
                        type="button"
                        disabled={disabled}
                        className="text-xs text-admin-text-secondary hover:underline disabled:opacity-60"
                        onClick={() => selectAllPhotos(item)}
                      >
                        Все до {MAX_COLLAGE_PHOTOS}
                      </button>
                    </div>
                    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {item.colorVariants.map((variant) => {
                        const checked = (item.selectedPhotoIds ?? []).includes(variant.id);
                        const thumb = toPublicImageSrc(variant.image);
                        return (
                          <li key={variant.id}>
                            <button
                              type="button"
                              disabled={disabled || (!checked && item.selectedPhotoIds.length >= MAX_COLLAGE_PHOTOS)}
                              onClick={() => togglePhoto(item, variant.id)}
                              className={`flex w-full items-center gap-2 rounded border px-2 py-1.5 text-left text-xs disabled:opacity-50 ${
                                checked
                                  ? "border-admin-text bg-admin-surface"
                                  : "border-admin-border bg-admin-surface"
                              }`}
                            >
                              {thumb ? (
                                <img src={thumb} alt="" className="h-10 w-8 shrink-0 object-cover" />
                              ) : (
                                <span className="flex h-10 w-8 shrink-0 items-center justify-center bg-admin-surface-muted text-[10px] text-admin-text-muted">
                                  нет
                                </span>
                              )}
                              <span className="min-w-0 flex-1 truncate">
                                {variant.color || "без цвета"}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
