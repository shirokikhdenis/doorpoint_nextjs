"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CatalogAttributeFilter,
  CatalogPageItem,
  CatalogMeta,
  ProductCard,
  normalizeCatalogMeta,
  normalizeCatalogPages,
  normalizeProductsResponse,
} from "@/lib/client/normalizers";

const formatPrice = (price: number) => `${Number(price || 0).toLocaleString("ru-RU")} ₽`;

const emptyMeta: CatalogMeta = {
  categories: [],
  subcategories: [],
  attributeFilters: [],
  price: { min: 0, max: 0 },
};

type NumericRange = { min: string; max: string };

export default function CatalogPage() {
  const [catalogPages, setCatalogPages] = useState<CatalogPageItem[]>([]);
  const [catalogPage, setCatalogPage] = useState("all");
  const [meta, setMeta] = useState<CatalogMeta>(emptyMeta);
  const [products, setProducts] = useState<ProductCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("alphabet-asc");
  const [categories, setCategories] = useState<string[]>([]);
  const [subcategories, setSubcategories] = useState<string[]>([]);
  // Множественные значения для option/text/boolean — храним как массив строк.
  const [attrSelections, setAttrSelections] = useState<Record<string, string[]>>({});
  // Числовые диапазоны: { [code]: { min: "45", max: "120" } }.
  const [attrRanges, setAttrRanges] = useState<Record<string, NumericRange>>({});
  const [priceRange, setPriceRange] = useState<NumericRange>({ min: "", max: "" });

  // Сбрасываем фильтры при переключении витрины — иначе остаются галки от другой витрины.
  const resetUserFilters = () => {
    setCategories([]);
    setSubcategories([]);
    setAttrSelections({});
    setAttrRanges({});
    setPriceRange({ min: "", max: "" });
  };

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("catalogPage", catalogPage);
    params.set("search", search);
    params.set("sort", sort);
    if (categories.length) params.set("categories", categories.join(","));
    if (subcategories.length) params.set("subcategories", subcategories.join(","));
    Object.entries(attrSelections).forEach(([code, values]) => {
      if (values.length > 0) params.set(`attr_${code}`, values.join(","));
    });
    Object.entries(attrRanges).forEach(([code, range]) => {
      if (range.min.trim() !== "") params.set(`attr_${code}_min`, range.min.trim());
      if (range.max.trim() !== "") params.set(`attr_${code}_max`, range.max.trim());
    });
    if (priceRange.min.trim() !== "") params.set("minPrice", priceRange.min.trim());
    if (priceRange.max.trim() !== "") params.set("maxPrice", priceRange.max.trim());
    return params.toString();
  }, [
    catalogPage,
    search,
    sort,
    categories,
    subcategories,
    attrSelections,
    attrRanges,
    priceRange,
  ]);

  useEffect(() => {
    const run = async () => {
      const pagesRes = await fetch("/api/products/catalog-pages");
      if (!pagesRes.ok) throw new Error("Не удалось загрузить разделы каталога");
      const safePages = normalizeCatalogPages(await pagesRes.json());
      setCatalogPages(safePages);
      if (safePages.length && !safePages.some((page: CatalogPageItem) => page.slug === catalogPage)) {
        const fallback = safePages.find((page: CatalogPageItem) => page.isDefault) || safePages[0];
        setCatalogPage(fallback?.slug || "all");
      }
    };
    run().catch((err: Error) => setError(err.message));
  }, [catalogPage]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");
      const [metaRes, productsRes] = await Promise.all([
        fetch(`/api/products/meta?catalogPage=${encodeURIComponent(catalogPage)}`),
        fetch(`/api/products?${query}`),
      ]);
      if (!metaRes.ok || !productsRes.ok) {
        throw new Error("Не удалось загрузить данные каталога");
      }
      setMeta(normalizeCatalogMeta(await metaRes.json()));
      setProducts(normalizeProductsResponse(await productsRes.json()));
      setLoading(false);
    };
    run().catch((err: Error) => {
      setError(err.message);
      setLoading(false);
    });
  }, [catalogPage, query]);

  const toggle = (value: string, state: string[], setState: (values: string[]) => void) => {
    setState(state.includes(value) ? state.filter((v) => v !== value) : [...state, value]);
  };

  const toggleAttrValue = (code: string, value: string) => {
    setAttrSelections((prev) => {
      const current = prev[code] || [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      if (next.length === 0) {
        const { [code]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [code]: next };
    });
  };

  const setAttrRange = (code: string, side: keyof NumericRange, value: string) => {
    setAttrRanges((prev) => {
      const current = prev[code] || { min: "", max: "" };
      const next = { ...current, [side]: value };
      if (next.min.trim() === "" && next.max.trim() === "") {
        const { [code]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [code]: next };
    });
  };

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 gap-6 p-6">
      <aside className="w-72 space-y-4 rounded-lg border bg-white p-4">
        <h2 className="text-lg font-semibold">Фильтры</h2>
        <input
          className="w-full rounded border px-3 py-2"
          placeholder="Поиск"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select className="w-full rounded border px-3 py-2" value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="alphabet-asc">По алфавиту (А-Я)</option>
          <option value="alphabet-desc">По алфавиту (Я-А)</option>
          <option value="price-asc">Цена по возрастанию</option>
          <option value="price-desc">Цена по убыванию</option>
        </select>

        {meta.categories.length > 0 ? (
          <div>
            <h3 className="mb-2 text-sm font-medium">Категории</h3>
            <div className="space-y-1 text-sm">
              {meta.categories.map((category) => (
                <label key={category.slug} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={categories.includes(category.slug)}
                    onChange={() => toggle(category.slug, categories, setCategories)}
                  />
                  {category.name}
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {meta.subcategories.length > 0 ? (
          <div>
            <h3 className="mb-2 text-sm font-medium">Подкатегории</h3>
            <div className="space-y-1 text-sm">
              {meta.subcategories.map((subcategory) => (
                <label key={subcategory.slug} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={subcategories.includes(subcategory.slug)}
                    onChange={() => toggle(subcategory.slug, subcategories, setSubcategories)}
                  />
                  {subcategory.name}
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {meta.price.max > meta.price.min ? (
          <div>
            <h3 className="mb-2 text-sm font-medium">Цена, ₽</h3>
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="numeric"
                placeholder={String(meta.price.min)}
                value={priceRange.min}
                onChange={(event) =>
                  setPriceRange((prev) => ({ ...prev, min: event.target.value }))
                }
                className="w-1/2 rounded border px-2 py-1 text-sm"
              />
              <input
                type="number"
                inputMode="numeric"
                placeholder={String(meta.price.max)}
                value={priceRange.max}
                onChange={(event) =>
                  setPriceRange((prev) => ({ ...prev, max: event.target.value }))
                }
                className="w-1/2 rounded border px-2 py-1 text-sm"
              />
            </div>
          </div>
        ) : null}

        {meta.attributeFilters.map((filter) => (
          <AttributeFilterBlock
            key={filter.code}
            filter={filter}
            selected={attrSelections[filter.code] || []}
            range={attrRanges[filter.code] || { min: "", max: "" }}
            onToggleValue={(value) => toggleAttrValue(filter.code, value)}
            onChangeRange={(side, value) => setAttrRange(filter.code, side, value)}
          />
        ))}
      </aside>

      <section className="flex-1 space-y-4">
        <div className="flex flex-wrap gap-2">
          {catalogPages.map((page) => (
            <button
              key={page.slug}
              onClick={() => {
                setCatalogPage(page.slug);
                resetUserFilters();
              }}
              className={`rounded border px-3 py-1 text-sm ${catalogPage === page.slug ? "bg-black text-white" : "bg-white"}`}
            >
              {page.name}
            </button>
          ))}
        </div>
        {loading ? (
          <div>Загрузка...</div>
        ) : error ? (
          <div className="rounded border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
        ) : products.length === 0 ? (
          <div className="rounded border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
            По выбранным фильтрам ничего не найдено.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((item) => (
              <article key={item.id} className="flex h-full flex-col rounded-lg bg-white p-3 shadow-sm">
                <Link href={`/product/${item.id}`} className="block">
                  <img
                    src={item.image || ""}
                    alt={item.name}
                    className="mb-3 h-100 w-full rounded bg-white object-contain p-2"
                  />
                  <h3 className="font-normal">{item.color ? `${item.name} ${item.color}` : item.name}</h3>
                  <p className="mt-2 text-sm text-zinc-600">{formatPrice(item.price)}</p>
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

type AttributeFilterBlockProps = {
  filter: CatalogAttributeFilter;
  selected: string[];
  range: NumericRange;
  onToggleValue: (value: string) => void;
  onChangeRange: (side: keyof NumericRange, value: string) => void;
};

/**
 * Универсальный блок для одного атрибутного фильтра. Сам решает, как рисоваться,
 * по `filter.type`. Если значений нет — блок не выводится (бэк положил пустой
 * values/range — значит у товаров в текущем скоупе атрибут не заполнен).
 */
function AttributeFilterBlock({
  filter,
  selected,
  range,
  onToggleValue,
  onChangeRange,
}: AttributeFilterBlockProps) {
  if (filter.type === "number") {
    const min = filter.min ?? 0;
    const max = filter.max ?? 0;
    if (max <= min) return null;
    return (
      <div>
        <h3 className="mb-2 text-sm font-medium">
          {filter.name}
          {filter.unit ? <span className="ml-1 text-xs text-zinc-500">({filter.unit})</span> : null}
        </h3>
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="numeric"
            placeholder={String(min)}
            value={range.min}
            onChange={(event) => onChangeRange("min", event.target.value)}
            className="w-1/2 rounded border px-2 py-1 text-sm"
          />
          <input
            type="number"
            inputMode="numeric"
            placeholder={String(max)}
            value={range.max}
            onChange={(event) => onChangeRange("max", event.target.value)}
            className="w-1/2 rounded border px-2 py-1 text-sm"
          />
        </div>
      </div>
    );
  }

  const values = filter.values || [];
  if (values.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium">{filter.name}</h3>
      <div className="space-y-1 text-sm">
        {values.map((value) => (
          <label key={value} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selected.includes(value)}
              onChange={() => onToggleValue(value)}
            />
            {value}
          </label>
        ))}
      </div>
    </div>
  );
}
