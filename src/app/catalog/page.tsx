"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  CatalogAttributeFilter,
  CatalogLabel,
  CatalogPageItem,
  CatalogMeta,
  ProductCard,
  isEntryDoorCatalogItem,
  normalizeCatalogMeta,
  normalizeCatalogPages,
  normalizeProductsResponse,
} from "@/lib/client/normalizers";
import { MeasureLeadForm } from "@/features/store/measure-lead-form";
import { chipToneClass } from "@/features/store/storefront-ui";

const formatPrice = (price: number) => `${Number(price || 0).toLocaleString("ru-RU")} ₽`;

/** Фиксированная высота превью в карточке каталога (класс h-100 в теме не задан). */
const CATALOG_CARD_IMAGE_HEIGHT = "h-[240px] sm:h-[320px] lg:h-[360px]";
const CATALOG_DUAL_PHOTO_GAP_PX = 3;
const CATALOG_DUAL_IMAGE_HEIGHT_PX = 250;

const emptyMeta: CatalogMeta = {
  categories: [],
  subcategories: [],
  attributeFilters: [],
  price: { min: 0, max: 0 },
  labels: [],
};

function applyLabelToSelections(label: CatalogLabel): Record<string, string[]> {
  const next: Record<string, string[]> = {};
  for (const rule of label.filters) {
    next[rule.code] = [rule.value];
  }
  return next;
}

function labelMatchesSelections(
  label: CatalogLabel,
  attrSelections: Record<string, string[]>,
): boolean {
  if (!label.filters.length) return false;
  return label.filters.every((rule) => {
    const cur = attrSelections[rule.code];
    return Array.isArray(cur) && cur.length === 1 && cur[0] === rule.value;
  });
}

type NumericRange = { min: string; max: string };

/** Снимок состояния при уходе в карточку товара (читаем один раз в layout). */
type CatalogReturnSnapshot = {
  catalogPage: string;
  scrollY: number;
  loadedPages: number;
  scrollApplied: boolean;
};

function CatalogPageContent() {
  const [catalogPages, setCatalogPages] = useState<CatalogPageItem[]>([]);
  // Инициализируем выбранную витрину из URL (`?catalogPage=...`) или из
  // sessionStorage (последняя витрина текущей сессии). Делает «Назад в каталог»
  // из карточки товара возвратом именно на ту витрину, с которой ушли — без
  // лишнего ре-фетча из-за двойной инициализации.
  const [catalogPage, setCatalogPage] = useState(() => {
    if (typeof window === "undefined") return "all";
    const fromUrl = new URLSearchParams(window.location.search).get("catalogPage");
    const fromStorage = window.sessionStorage.getItem("lastCatalogPage");
    return fromUrl || fromStorage || "all";
  });
  const [meta, setMeta] = useState<CatalogMeta>(emptyMeta);
  const [products, setProducts] = useState<ProductCard[]>([]);
  const [hoveredProductId, setHoveredProductId] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  // Текущий номер «страницы» (батча) в режиме «Показать ещё». На смене фильтров
  // или витрины сбрасывается обратно в 1.
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const LIMIT = 20;

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("popularity");
  const [categories, setCategories] = useState<string[]>([]);
  const [subcategories, setSubcategories] = useState<string[]>([]);
  // Множественные значения для option/text/boolean — храним как массив строк.
  const [attrSelections, setAttrSelections] = useState<Record<string, string[]>>({});
  // Числовые диапазоны: { [code]: { min: "45", max: "120" } }.
  const [attrRanges, setAttrRanges] = useState<Record<string, NumericRange>>({});
  const [priceRange, setPriceRange] = useState<NumericRange>({ min: "", max: "" });
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Сбрасываем фильтры при переключении витрины — иначе остаются галки от другой витрины.
  const resetUserFilters = () => {
    setCategories([]);
    setSubcategories([]);
    setAttrSelections({});
    setAttrRanges({});
    setPriceRange({ min: "", max: "" });
  };

  const catalogReturnSnapshotRef = useRef<CatalogReturnSnapshot | null>(null);

  // До любых useEffect: забираем sessionStorage в ref, чтобы эффекты загрузки
  // и скролла не гонялись за одной строкой JSON и не обнуляли друг друга при
  // Strict Mode / отмене fetch.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    // Уже захватили снимок (например, первый проход Strict Mode) — не перезаписываем.
    if (catalogReturnSnapshotRef.current) return;
    const raw = window.sessionStorage.getItem("catalogScroll");
    if (!raw) return;
    try {
      const p = JSON.parse(raw) as {
        catalogPage?: string;
        scrollY?: unknown;
        loadedPages?: unknown;
      };
      const slug = String(p.catalogPage || "").trim();
      if (!slug) return;
      catalogReturnSnapshotRef.current = {
        catalogPage: slug,
        scrollY: Number(p.scrollY) || 0,
        loadedPages: Math.min(25, Math.max(1, Number(p.loadedPages) || 1)),
        scrollApplied: false,
      };
    } catch {
      catalogReturnSnapshotRef.current = null;
    }
    // Не вызываем removeItem здесь: в Strict Mode layout срабатывает дважды,
    // второй проход должен снова прочитать тот же JSON из sessionStorage.
  }, []);

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

  // Сохраняем перед переходом в карточку: позицию скролла, slug витрины и
  // сколько «страниц» товаров уже было подгружено через «Показать ещё», чтобы
  // на возврате восстановить и список, и место в нём.
  const rememberScrollForProduct = () => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(
        "catalogScroll",
        JSON.stringify({
          catalogPage,
          scrollY: window.scrollY,
          loadedPages: page,
        }),
      );
    } catch {
      // sessionStorage может быть недоступен (private mode и т.п.) — это ок,
      // просто без восстановления скролла.
    }
  };

  // Синхронизация выбранной витрины в URL и sessionStorage: чтобы «Назад в каталог»
  // из карточки товара вернул именно на ту витрину, с которой ушли.
  useEffect(() => {
    if (typeof window === "undefined" || !catalogPage) return;
    window.sessionStorage.setItem("lastCatalogPage", catalogPage);
    const params = new URLSearchParams(window.location.search);
    if (params.get("catalogPage") !== catalogPage) {
      params.set("catalogPage", catalogPage);
      const next = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState(null, "", next);
    }
  }, [catalogPage]);

  // Реакция на смену `?catalogPage=` снаружи (глобальный навбар витрин кликает
  // по Link — Next перерисовывает страницу с новым search-параметром, но компонент
  // не размонтируется, поэтому локальный стейт нужно подтолкнуть руками).
  const searchParams = useSearchParams();
  useEffect(() => {
    if (!searchParams) return;
    const next = searchParams.get("catalogPage");
    if (!next || next === catalogPage) return;
    setCatalogPage(next);
    setCategories([]);
    setSubcategories([]);
    setAttrSelections({});
    setAttrRanges({});
    setPriceRange({ min: "", max: "" });
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.delete("catalogLabel");
      const qs = params.toString();
      window.history.replaceState(null, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
    }
    // catalogPage умышленно не в зависимостях: иначе после `setCatalogPage` эффект
    // сразу же отработал бы повторно с уже актуальным значением.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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

  // Мета (категории/подкатегории/атрибуты/ярлыки/диапазон цен) зависит только от
  // витрины. После загрузки применяем `catalogLabel` из URL, если есть.
  useEffect(() => {
    let cancelled = false;
    setMeta(emptyMeta);
    (async () => {
      try {
        const res = await fetch(
          `/api/products/meta?catalogPage=${encodeURIComponent(catalogPage)}`,
        );
        if (!res.ok) throw new Error("Не удалось загрузить фильтры");
        const json = await res.json();
        if (cancelled) return;
        const nextMeta = normalizeCatalogMeta(json);
        setMeta(nextMeta);

        if (typeof window !== "undefined") {
          const raw = new URLSearchParams(window.location.search).get("catalogLabel");
          if (raw && nextMeta.labels.length > 0) {
            const id = Number(raw);
            const label = nextMeta.labels.find((l) => l.id === id);
            if (label) {
              setAttrSelections(applyLabelToSelections(label));
              setAttrRanges({});
            }
          }
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [catalogPage]);

  // Синхронизация `catalogLabel` в URL с текущими фильтрами (глубокая ссылка на ярлык).
  useEffect(() => {
    if (typeof window === "undefined" || meta.labels.length === 0) return;
    const matching = meta.labels.find((l) => labelMatchesSelections(l, attrSelections));
    const params = new URLSearchParams(window.location.search);
    if (matching) params.set("catalogLabel", String(matching.id));
    else params.delete("catalogLabel");
    if (params.get("catalogPage") !== catalogPage) params.set("catalogPage", catalogPage);
    const qs = params.toString();
    const nextUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    const cur = window.location.pathname + window.location.search;
    if (nextUrl !== cur) window.history.replaceState(null, "", nextUrl);
  }, [attrSelections, meta.labels, catalogPage]);

  // Любая смена запроса (фильтры/поиск/сорт/витрина) сбрасывает пагинацию.
  useEffect(() => {
    setPage(1);
  }, [query]);

  // Сторож, чтобы не выполнить один и тот же запрос дважды. После восстановления
  // нескольких страниц мы вручную выставляем `page=N` — на следующем рендере
  // этот же эффект увидит [query, page=N], но lastFetched уже будет таким же,
  // и мы аккуратно пропустим повторный fetch.
  const lastFetchedRef = useRef<{ query: string; page: number }>({ query: "", page: 0 });
  // «Проверка восстановления списка» завершена только после await или синхронного
  // отказа — иначе при отмене эффекта (смена query до await) флаг true ломал повтор.
  const restoreCheckDoneRef = useRef(false);
  const scrollRestoredRef = useRef(false);

  useEffect(() => {
    if (
      lastFetchedRef.current.query === query &&
      lastFetchedRef.current.page === page
    ) {
      return;
    }
    let cancelled = false;
    (async () => {
      if (page === 1) setLoading(true);
      else setLoadingMore(true);
      setError("");
      try {
        // Первый прогон: снимок из layout (sessionStorage читается там же, remove — после скролла).
        if (!restoreCheckDoneRef.current && page === 1) {
          const snap = catalogReturnSnapshotRef.current;
          if (snap?.catalogPage === catalogPage) {
            const wantPages = snap.loadedPages;
            if (wantPages > 1) {
              const numbers = Array.from({ length: wantPages }, (_, i) => i + 1);
              const responses = await Promise.all(
                numbers.map(async (p) => {
                  const params = new URLSearchParams(query);
                  params.set("page", String(p));
                  params.set("limit", String(LIMIT));
                  const r = await fetch(`/api/products?${params.toString()}`);
                  if (!r.ok) throw new Error("Не удалось загрузить данные каталога");
                  return (await r.json()) as { total?: number };
                }),
              );
              if (cancelled) return;
              const all = responses.flatMap((j) => normalizeProductsResponse(j));
              const lastTotal = Number(responses[responses.length - 1]?.total) || all.length;
              setTotal(lastTotal);
              setProducts(all);
              lastFetchedRef.current = { query, page: wantPages };
              setPage(wantPages);
              restoreCheckDoneRef.current = true;
              return;
            }
          }
          // Нет снимка, другая витрина или loadedPages === 1 — повторять restore не нужно.
          restoreCheckDoneRef.current = true;
        }

        const params = new URLSearchParams(query);
        params.set("page", String(page));
        params.set("limit", String(LIMIT));
        const res = await fetch(`/api/products?${params.toString()}`);
        if (!res.ok) throw new Error("Не удалось загрузить данные каталога");
        const json = (await res.json()) as { total?: number };
        if (cancelled) return;
        const items = normalizeProductsResponse(json);
        setTotal(Number(json?.total) || 0);
        setProducts((prev) => (page === 1 ? items : [...prev, ...items]));
        lastFetchedRef.current = { query, page };
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query, page, catalogPage]);

  // После эффекта загрузки товаров: восстановить скролл и очистить снимок.
  // Объявлен ниже fetch-эффекта, чтобы при loading=false сначала отработала
  // подгрузка списка (в т.ч. multi-page restore), и только потом scrollTo.
  useEffect(() => {
    if (loading || scrollRestoredRef.current || typeof window === "undefined") return;
    const snap = catalogReturnSnapshotRef.current;
    if (!snap || snap.scrollApplied) {
      scrollRestoredRef.current = true;
      return;
    }
    if (snap.catalogPage !== catalogPage) {
      scrollRestoredRef.current = true;
      catalogReturnSnapshotRef.current = null;
      try {
        window.sessionStorage.removeItem("catalogScroll");
      } catch {
        /* ignore */
      }
      return;
    }
    const targetY = snap.scrollY;
    if (!Number.isFinite(targetY) || targetY <= 0) {
      snap.scrollApplied = true;
      scrollRestoredRef.current = true;
    } else {
      scrollRestoredRef.current = true;
      snap.scrollApplied = true;
      window.scrollTo({ top: targetY, behavior: "auto" });
      requestAnimationFrame(() => window.scrollTo({ top: targetY, behavior: "auto" }));
    }
    try {
      window.sessionStorage.removeItem("catalogScroll");
    } catch {
      /* ignore */
    }
    catalogReturnSnapshotRef.current = null;
  }, [loading, catalogPage]);

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

  const handleLabelClick = (label: CatalogLabel) => {
    if (labelMatchesSelections(label, attrSelections)) {
      setAttrSelections((prev) => {
        const next = { ...prev };
        for (const rule of label.filters) {
          delete next[rule.code];
        }
        return next;
      });
      setAttrRanges({});
      return;
    }
    setAttrSelections(applyLabelToSelections(label));
    setAttrRanges({});
  };

  return (
    <>
      {meta.labels.length > 0 ? (
        <div className="mx-auto w-full max-w-[1600px] px-4 pt-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-3 pb-2 pt-1">
            {meta.labels.map((label) => {
              const active = labelMatchesSelections(label, attrSelections);
              return (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => handleLabelClick(label)}
                  className={`flex min-w-0 shrink-0 grow-0 basis-[calc((100%-0.75rem)/2)] flex-col items-center gap-3 rounded-lg border bg-white px-3 py-[1.125rem] text-center transition hover:shadow-md sm:basis-[calc((100%-1.5rem)/3)] md:basis-[calc((100%-2.25rem)/4)] lg:basis-[calc((100%-3.75rem)/6)] ${
                    active
                      ? "border-zinc-200 shadow-xl shadow-zinc-900/20"
                      : "border-zinc-200 shadow-sm"
                  }`}
                >
                  <span className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-zinc-50">
                    {label.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={label.imageUrl}
                        alt=""
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="text-[12px] text-zinc-400">нет фото</span>
                    )}
                  </span>
                  <span className="text-xs font-medium leading-snug text-zinc-800 sm:text-sm">{label.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <main className="mx-auto flex w-full max-w-[1630px] flex-1 flex-col gap-4 px-4 pb-6 pt-2 sm:px-6 lg:px-8">
        <div className="flex w-full flex-1 flex-col gap-4 lg:flex-row lg:gap-6">
          <aside
            className={`${isMobileFiltersOpen ? "block" : "hidden"} w-full space-y-4 rounded-lg border bg-white p-4 shadow-md lg:sticky lg:top-[120px] lg:block lg:w-72 lg:self-start`}
          >
        <h2 className="text-lg font-semibold">Фильтры</h2>
        <input
          className="w-full rounded border px-3 py-2"
          placeholder="Поиск"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select className="w-full rounded border px-3 py-2" value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="popularity">По популярности</option>
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
                className="min-w-0 flex-1 rounded border px-2 py-1 text-sm"
              />
              <input
                type="number"
                inputMode="numeric"
                placeholder={String(meta.price.max)}
                value={priceRange.max}
                onChange={(event) =>
                  setPriceRange((prev) => ({ ...prev, max: event.target.value }))
                }
                className="min-w-0 flex-1 rounded border px-2 py-1 text-sm"
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
            <div className="flex items-center justify-between gap-2 lg:hidden">
              <button
                type="button"
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800"
                onClick={() => setIsMobileFiltersOpen((current) => !current)}
              >
                {isMobileFiltersOpen ? "Скрыть фильтры" : "Показать фильтры"}
              </button>
              <span className="text-xs text-zinc-500">
                {products.length > 0 ? `${products.length} из ${total}` : "Подберите параметры"}
              </span>
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
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3 2xl:grid-cols-4">
                {products.map((item) => {
                  const isEntryDoor = isEntryDoorCatalogItem(item);
                  const dualPhotos =
                    isEntryDoor &&
                    Boolean(item.image) &&
                    Boolean(item.hoverImage && item.hoverImage !== item.image);
                  const showHover =
                    !dualPhotos &&
                    hoveredProductId === item.id &&
                    Boolean(item.hoverImage && item.hoverImage !== item.image);
                  const cardImage = showHover ? item.hoverImage : item.image || "";
                  return (
                  <article
                    key={item.id}
                    className="flex h-full flex-col rounded-lg bg-white p-2 shadow-md transition-shadow duration-150 hover:shadow-lg"
                    onMouseEnter={dualPhotos ? undefined : () => setHoveredProductId(item.id)}
                    onMouseLeave={dualPhotos ? undefined : () => setHoveredProductId(null)}
                  >
                    <Link
                      href={`/product/${item.id}`}
                      className="block"
                      onClick={rememberScrollForProduct}
                    >
                      {dualPhotos ? (
                        <div
                          className="mb-3 grid grid-cols-2 gap-0 overflow-hidden bg-white p-2"
                          style={{ columnGap: `${CATALOG_DUAL_PHOTO_GAP_PX}px` }}
                        >
                          <div className="flex h-full items-center justify-center overflow-hidden bg-white">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.image || ""}
                              alt={item.name}
                              className="block w-full object-contain object-right"
                              style={{ height: `${CATALOG_DUAL_IMAGE_HEIGHT_PX}px` }}
                            />
                          </div>
                          <div className="flex h-full items-center justify-center overflow-hidden bg-white">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.hoverImage || ""}
                              alt=""
                              className="block w-full object-contain object-left"
                              style={{ height: `${CATALOG_DUAL_IMAGE_HEIGHT_PX}px` }}
                              aria-hidden
                            />
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`mb-3 ${CATALOG_CARD_IMAGE_HEIGHT} flex items-center justify-center overflow-hidden bg-white p-2`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={cardImage || ""}
                            alt={item.name}
                            className="block h-full w-full object-contain object-center"
                          />
                        </div>
                      )}
                      <h3 className="font-normal">{item.color ? `${item.name} ${item.color}` : item.name}</h3>
                      <p className="mt-2 text-base font-medium text-zinc-800">{formatPrice(item.price)}</p>
                    </Link>
                  </article>
                  );
                })}
              </div>
            )}
            {!loading && !error && products.length > 0 && products.length < total ? (
              <div className="flex flex-col items-center gap-1 pt-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={loadingMore}
                  className="rounded-full border border-zinc-300 bg-white px-5 py-2 text-sm font-medium text-zinc-800 transition hover:border-zinc-500 hover:bg-zinc-50 disabled:cursor-wait disabled:opacity-60"
                >
                  {loadingMore ? "Загрузка…" : `Показать ещё (${total - products.length})`}
                </button>
                <span className="text-xs text-zinc-500">
                  {products.length} из {total}
                </span>
              </div>
            ) : null}
          </section>
        </div>
      </main>
      <MeasureLeadForm />
    </>
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
            className="min-w-0 flex-1 rounded border px-2 py-1 text-sm"
          />
          <input
            type="number"
            inputMode="numeric"
            placeholder={String(max)}
            value={range.max}
            onChange={(event) => onChangeRange("max", event.target.value)}
            className="min-w-0 flex-1 rounded border px-2 py-1 text-sm"
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

export default function CatalogPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-7xl px-4 py-6 text-sm text-zinc-500 sm:px-6 lg:px-8">
          Загрузка каталога…
        </main>
      }
    >
      <CatalogPageContent />
    </Suspense>
  );
}
