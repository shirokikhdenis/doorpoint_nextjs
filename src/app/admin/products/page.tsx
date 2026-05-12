"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type AttributeDef = {
  id: number;
  code: string;
  name: string;
  type: string;
  isFilterable?: boolean;
  isVariantAxis?: boolean;
  options?: Array<string | { value: string }>;
};

type CategoryRef = { id: number; name: string };
type SubcategoryRef = { id: number; categoryId: number; name: string };

type ProductRow = {
  id: number;
  sku: string;
  name: string;
  price: number;
  modelKey: string | null;
  category: string;
  subcategory: string;
  isActive: boolean;
  attributes: Record<string, string | number | boolean | null>;
  variantsCount: number;
  imagesCount: number;
};

type ProductsTableResponse = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  attributes: AttributeDef[];
  categories: CategoryRef[];
  subcategories: SubcategoryRef[];
  rows: ProductRow[];
};

const LIMIT_OPTIONS = [50, 100, 200, 500];

const formatAttrValue = (value: ProductRow["attributes"][string]): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Да" : "Нет";
  return String(value);
};

const formatPrice = (price: number): string =>
  Number.isFinite(price) ? new Intl.NumberFormat("ru-RU").format(Math.round(price)) : "—";

export default function AdminProductsPage() {
  const [data, setData] = useState<ProductsTableResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number>(0);
  const [subcategoryId, setSubcategoryId] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(100);
  const [reloadToken, setReloadToken] = useState<number>(0);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (appliedSearch.trim()) params.set("search", appliedSearch.trim());
      if (categoryId) params.set("categoryId", String(categoryId));
      if (subcategoryId) params.set("subcategoryId", String(subcategoryId));
      try {
        const response = await fetch(
          `/api/admin/products-table?${params.toString()}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = (await response.json()) as ProductsTableResponse;
        if (!cancelled) setData(json);
      } catch (caught) {
        if (cancelled || (caught instanceof DOMException && caught.name === "AbortError")) return;
        setError(caught instanceof Error ? caught.message : "Ошибка загрузки");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [page, limit, appliedSearch, categoryId, subcategoryId, reloadToken]);

  const triggerReload = () => setReloadToken((token) => token + 1);

  const onSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setAppliedSearch(search);
    triggerReload();
  };

  const visibleSubcategories = useMemo(
    () =>
      categoryId
        ? (data?.subcategories || []).filter((sub) => sub.categoryId === categoryId)
        : data?.subcategories || [],
    [data?.subcategories, categoryId],
  );

  const attributes = data?.attributes || [];
  const rows = data?.rows || [];

  const categoryNameById = useMemo(() => {
    const map = new Map<number, string>();
    (data?.categories || []).forEach((c) => map.set(c.id, c.name));
    return map;
  }, [data?.categories]);

  const subcategoryNameById = useMemo(() => {
    const map = new Map<number, string>();
    (data?.subcategories || []).forEach((s) => map.set(s.id, s.name));
    return map;
  }, [data?.subcategories]);

  const handleDeleteByCategory = async () => {
    if (deleting) return;
    if (!subcategoryId && !categoryId) {
      setNotice("Выберите категорию или подкатегорию в фильтре.");
      return;
    }
    const subName = subcategoryId ? subcategoryNameById.get(subcategoryId) : "";
    const catName = categoryId ? categoryNameById.get(categoryId) : "";
    const scopeText = subcategoryId
      ? `подкатегории «${subName || `#${subcategoryId}`}»`
      : `категории «${catName || `#${categoryId}`}» (все подкатегории этой ветки)`;
    const searchNote =
      appliedSearch.trim().length > 0
        ? "\n\nУдаляются все товары в этой области таксономии, не только строки, попавшие под текущий поиск."
        : "";
    const first = window.confirm(
      `Удалить все товары из ${scopeText}?\n\nВместе с ними пропадут варианты и привязки картинок. Действие необратимо.${searchNote}`,
    );
    if (!first) return;
    const phrase = window.prompt(
      "Чтобы подтвердить, введите слово DELETE заглавными буквами:",
      "",
    );
    if (phrase !== "DELETE") {
      setNotice("Удаление отменено — подтверждение не совпало.");
      return;
    }
    setDeleting(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (subcategoryId) params.set("subcategoryId", String(subcategoryId));
      else if (categoryId) params.set("categoryId", String(categoryId));
      const response = await fetch(`/api/admin/products?${params.toString()}`, { method: "DELETE" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = (await response.json()) as { deleted?: number };
      setNotice(`Удалено товаров: ${Number(body.deleted || 0)}.`);
      setPage(1);
      triggerReload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка удаления");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    if (deleting) return;
    if (!data || data.total === 0) {
      setNotice("В базе нет товаров — удалять нечего.");
      return;
    }
    const first = window.confirm(
      `Удалить ВСЕ ${data.total} товаров?\n\nВместе с ними пропадут все варианты и привязки картинок. Действие необратимо.`,
    );
    if (!first) return;
    const phrase = window.prompt(
      "Чтобы подтвердить, введите слово DELETE заглавными буквами:",
      "",
    );
    if (phrase !== "DELETE") {
      setNotice("Удаление отменено — подтверждение не совпало.");
      return;
    }
    setDeleting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/products", { method: "DELETE" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = (await response.json()) as { deleted?: number };
      setNotice(`Удалено товаров: ${Number(body.deleted || 0)}.`);
      setPage(1);
      triggerReload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка удаления");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Товары</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Все карточки и их характеристики из таблицы <code className="rounded bg-zinc-100 px-1">products</code>{" "}
            (атрибуты — из JSONB-поля <code className="rounded bg-zinc-100 px-1">attrs</code>).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/import"
            className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:bg-zinc-100"
          >
            Импорт CSV →
          </Link>
          <Link
            href="/admin"
            className="rounded border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-100"
          >
            ← К админке
          </Link>
        </div>
      </header>

      <form
        onSubmit={onSearchSubmit}
        className="flex flex-wrap items-end gap-2 rounded-lg border bg-white p-3"
      >
        <label className="flex flex-1 min-w-[220px] flex-col gap-1 text-xs text-zinc-600">
          Поиск (по SKU или названию)
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="например, BRAVO"
            className="rounded border border-zinc-200 px-3 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-600">
          Категория
          <select
            value={categoryId}
            onChange={(event) => {
              setCategoryId(Number(event.target.value));
              setSubcategoryId(0);
              setPage(1);
            }}
            className="rounded border border-zinc-200 px-3 py-1.5 text-sm"
          >
            <option value={0}>Все</option>
            {(data?.categories || []).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-600">
          Подкатегория
          <select
            value={subcategoryId}
            onChange={(event) => {
              setSubcategoryId(Number(event.target.value));
              setPage(1);
            }}
            className="rounded border border-zinc-200 px-3 py-1.5 text-sm"
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
        <label className="flex flex-col gap-1 text-xs text-zinc-600">
          На странице
          <select
            value={limit}
            onChange={(event) => {
              setLimit(Number(event.target.value));
              setPage(1);
            }}
            className="rounded border border-zinc-200 px-3 py-1.5 text-sm"
          >
            {LIMIT_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded bg-black px-3 py-1.5 text-sm text-white"
          disabled={loading}
        >
          {loading ? "Загрузка…" : "Применить"}
        </button>
        <button
          type="button"
          onClick={() => {
            setSearch("");
            setCategoryId(0);
            setSubcategoryId(0);
            setPage(1);
          }}
          className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:bg-zinc-100"
        >
          Сбросить фильтры
        </button>
        <span className="ml-auto flex items-center gap-3">
          {data ? (
            <span className="text-xs text-zinc-500">
              Всего товаров: <strong className="text-zinc-800">{data.total}</strong>
            </span>
          ) : null}
          <button
            type="button"
            onClick={handleDeleteByCategory}
            disabled={deleting || (!categoryId && !subcategoryId)}
            className="rounded border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
            title="Удалить все товары выбранной категории или подкатегории (без учёта поиска)"
          >
            {deleting ? "Удаляем…" : "Удалить товары категории"}
          </button>
          <button
            type="button"
            onClick={handleDeleteAll}
            disabled={deleting || !data || data.total === 0}
            className="rounded border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            title="Удалить все товары из БД"
          >
            {deleting ? "Удаляем…" : "Удалить все товары"}
          </button>
        </span>
      </form>

      {error ? (
        <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {notice}
        </div>
      ) : null}

      <section className="rounded-lg border bg-white">
        <div className="overflow-auto">
          <table className="w-full min-w-[1200px] text-left text-xs">
            <thead className="sticky top-0 z-10 bg-zinc-50 text-[11px] uppercase text-zinc-500">
              <tr>
                <th className="px-2 py-2">ID</th>
                <th className="px-2 py-2">SKU</th>
                <th className="px-2 py-2">Название</th>
                <th className="px-2 py-2">Категория</th>
                <th className="px-2 py-2">Подкатегория</th>
                <th className="px-2 py-2 text-right">Цена</th>
                <th className="px-2 py-2 text-center">Активен</th>
                <th className="px-2 py-2 text-right">Вариантов</th>
                <th className="px-2 py-2 text-right">Картинок</th>
                <th className="px-2 py-2">model_key</th>
                {attributes.map((attribute) => (
                  <th
                    key={attribute.id}
                    className="whitespace-nowrap px-2 py-2"
                    title={`${attribute.code} · ${attribute.type}${attribute.isVariantAxis ? " · variant" : ""}`}
                  >
                    {attribute.name}
                    {attribute.isVariantAxis ? (
                      <span className="ml-1 rounded bg-violet-100 px-1 text-[10px] text-violet-700">var</span>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={10 + attributes.length}
                    className="px-3 py-6 text-center text-sm text-zinc-500"
                  >
                    {loading ? "Загрузка…" : "Товары не найдены"}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t hover:bg-zinc-50">
                    <td className="px-2 py-1 text-zinc-500">{row.id}</td>
                    <td className="px-2 py-1 font-mono text-zinc-700">{row.sku}</td>
                    <td className="px-2 py-1 text-zinc-800">{row.name}</td>
                    <td className="px-2 py-1 text-zinc-600">{row.category || "—"}</td>
                    <td className="px-2 py-1 text-zinc-600">{row.subcategory || "—"}</td>
                    <td className="px-2 py-1 text-right text-zinc-800">{formatPrice(row.price)}</td>
                    <td className="px-2 py-1 text-center">
                      {row.isActive ? (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] text-emerald-700">
                          да
                        </span>
                      ) : (
                        <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[11px] text-zinc-600">
                          нет
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1 text-right text-zinc-700">{row.variantsCount}</td>
                    <td className="px-2 py-1 text-right text-zinc-700">{row.imagesCount}</td>
                    <td className="px-2 py-1 font-mono text-[11px] text-zinc-500">{row.modelKey || ""}</td>
                    {attributes.map((attribute) => (
                      <td
                        key={attribute.id}
                        className="whitespace-nowrap px-2 py-1 text-zinc-700"
                      >
                        {formatAttrValue(row.attributes?.[attribute.code])}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && data.total > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2 text-xs text-zinc-600">
            <span>
              Показано {rows.length} из {data.total} (страница {data.page} из {data.totalPages})
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={data.page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded border border-zinc-200 bg-white px-2 py-1 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ← Назад
              </button>
              <button
                type="button"
                disabled={data.page >= data.totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border border-zinc-200 bg-white px-2 py-1 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Вперёд →
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
