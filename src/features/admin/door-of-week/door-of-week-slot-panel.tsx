"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminCard } from "@/features/admin/ui/admin-card";
import { AdminEmptyState } from "@/features/admin/ui/admin-empty-state";
import { formatPrice } from "@/lib/client/format";

export type DoorOfWeekPoolRow = {
  id: number;
  productId: number;
  sortOrder: number;
  name: string;
  sku: string;
  slug: string;
  image: string;
  price: number;
};

export type DoorOfWeekBlock = {
  slot: number;
  settings: {
    isEnabled: boolean;
    discountPercent: number;
    title: string;
  };
  pool: DoorOfWeekPoolRow[];
  currentProduct: DoorOfWeekPoolRow | null;
};

type ProductSearchRow = {
  id: number;
  name: string;
  sku: string;
};

type DoorOfWeekSlotPanelProps = {
  block: DoorOfWeekBlock;
  saving: boolean;
  onActionStart: () => void;
  onPayload: (payload: unknown) => void;
  onError: (message: string) => void;
};

export function DoorOfWeekSlotPanel({
  block,
  saving,
  onActionStart,
  onPayload,
  onError,
}: DoorOfWeekSlotPanelProps) {
  const [settings, setSettings] = useState(block.settings);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ProductSearchRow[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    setSettings(block.settings);
  }, [block.settings]);

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void (async () => {
        setSearching(true);
        try {
          const params = new URLSearchParams({ search: q, limit: "10", page: "1" });
          const response = await fetch(`/api/admin/products-table?${params.toString()}`);
          if (!response.ok) throw new Error("search failed");
          const json = (await response.json()) as {
            rows?: Array<{ id: unknown; name: unknown; sku: unknown }>;
          };
          setResults(
            Array.isArray(json.rows)
              ? json.rows.map((row) => ({
                  id: Number(row.id) || 0,
                  name: String(row.name || ""),
                  sku: String(row.sku || ""),
                }))
              : [],
          );
        } catch {
          setResults([]);
        } finally {
          setSearching(false);
        }
      })();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    onActionStart();
    try {
      const response = await fetch(`/api/admin/door-of-week/${block.slot}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message || "Не удалось сохранить");
      }
      onPayload(await response.json());
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Ошибка сохранения");
    }
  };

  const addProduct = async (productId: number) => {
    if (saving) return;
    onActionStart();
    try {
      const response = await fetch(`/api/admin/door-of-week/${block.slot}/products`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message || "Не удалось добавить товар");
      }
      onPayload(await response.json());
      setSearch("");
      setResults([]);
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Ошибка добавления");
    }
  };

  const removeProduct = async (productId: number) => {
    if (saving) return;
    onActionStart();
    try {
      const response = await fetch(`/api/admin/door-of-week/${block.slot}/products/${productId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message || "Не удалось удалить товар");
      }
      onPayload(await response.json());
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Ошибка удаления");
    }
  };

  const moveProduct = async (productId: number, direction: "up" | "down") => {
    if (saving) return;
    onActionStart();
    try {
      const response = await fetch(
        `/api/admin/door-of-week/${block.slot}/products/${productId}/move`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ direction }),
        },
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message || "Не удалось изменить порядок");
      }
      onPayload(await response.json());
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Ошибка сортировки");
    }
  };

  return (
    <div className="space-y-6">
      <AdminCard title={`Блок ${block.slot}`}>
        <form onSubmit={(event) => void saveSettings(event)} className="space-y-4">
          <label className="flex items-center gap-2 text-sm text-admin-text">
            <input
              type="checkbox"
              checked={settings.isEnabled}
              onChange={(event) =>
                setSettings((current) => ({ ...current, isEnabled: event.target.checked }))
              }
            />
            Показывать на главной
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-admin-text">
              <span className="mb-1 block text-admin-text-muted">Заголовок</span>
              <input
                type="text"
                value={settings.title}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, title: event.target.value }))
                }
                className="w-full border border-admin-input-border bg-admin-input-bg px-3 py-2"
              />
            </label>
            <label className="block text-sm text-admin-text">
              <span className="mb-1 block text-admin-text-muted">Скидка, %</span>
              <input
                type="number"
                min={1}
                max={90}
                value={settings.discountPercent}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    discountPercent: Number(event.target.value) || 10,
                  }))
                }
                className="w-full border border-admin-input-border bg-admin-input-bg px-3 py-2"
              />
            </label>
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? "Сохраняем…" : "Сохранить настройки"}
          </Button>
        </form>
      </AdminCard>

      <AdminCard title="Текущая неделя">
        {block.currentProduct ? (
          <div className="space-y-1 text-sm text-admin-text">
            <p>
              <span className="text-admin-text-muted">Товар:</span> {block.currentProduct.name}
            </p>
            <p>
              <span className="text-admin-text-muted">Цена:</span>{" "}
              {formatPrice(block.currentProduct.price)}
            </p>
            <p>
              <span className="text-admin-text-muted">Со скидкой:</span>{" "}
              {formatPrice(
                Math.round((block.currentProduct.price * (100 - settings.discountPercent)) / 100),
              )}
            </p>
          </div>
        ) : (
          <p className="text-sm text-admin-text-muted">
            Активный товар не выбран — включите блок и добавьте товары в пул.
          </p>
        )}
      </AdminCard>

      <AdminCard title="Пул товаров">
        <div className="mb-4 space-y-2">
          <label
            className="block text-sm text-admin-text-muted"
            htmlFor={`door-of-week-search-${block.slot}`}
          >
            Добавить товар
          </label>
          <input
            id={`door-of-week-search-${block.slot}`}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по названию или артикулу"
            className="w-full border border-admin-input-border bg-admin-input-bg px-3 py-2 text-sm"
          />
          {searching ? <p className="text-xs text-admin-text-muted">Поиск…</p> : null}
          {results.length > 0 ? (
            <ul className="divide-y divide-admin-border rounded border border-admin-border">
              {results.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-admin-text">{row.name}</p>
                    <p className="text-xs text-admin-text-muted">{row.sku || "Без артикула"}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={saving}
                    onClick={() => void addProduct(row.id)}
                  >
                    Добавить
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {block.pool.length === 0 ? (
          <AdminEmptyState title="Пул пуст" description="Добавьте товары для еженедельной ротации." />
        ) : (
          <ul className="divide-y divide-admin-border">
            {block.pool.map((row, index) => (
              <li key={row.productId} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-admin-text">{row.name}</p>
                  <p className="text-xs text-admin-text-muted">
                    {row.sku || "Без артикула"} · {formatPrice(row.price)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={saving || index === 0}
                    onClick={() => void moveProduct(row.productId, "up")}
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={saving || index === block.pool.length - 1}
                    onClick={() => void moveProduct(row.productId, "down")}
                  >
                    ↓
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={saving}
                    onClick={() => void removeProduct(row.productId)}
                  >
                    Удалить
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
    </div>
  );
}
