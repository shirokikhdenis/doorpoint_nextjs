"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cartStore } from "@/lib/client/cart-store";
import {
  AccessoryItem,
  ProductData,
  Variant,
  isEntryDoorCatalogItem,
  normalizeProductData,
} from "@/lib/client/normalizers";
import { MeasureLeadForm } from "@/features/store/measure-lead-form";
import { chipToneClass } from "@/features/store/storefront-ui";

const formatPrice = (price: number) => `${Number(price || 0).toLocaleString("ru-RU")} ₽`;
const PRODUCT_DUAL_PHOTO_GAP_PX = 3;

const variantAxesLabel = (variant: Variant): string => {
  const axes = variant.attributes.filter((attribute) => attribute.isVariantAxis);
  const source = axes.length > 0 ? axes : variant.attributes;
  if (source.length === 0) return variant.sku;
  return source.map((attribute) => `${attribute.name}: ${attribute.value}`).join(" · ");
};

const variantCartSuffix = (variant: Variant): string => {
  const axes = variant.attributes.filter((attribute) => attribute.isVariantAxis);
  if (axes.length === 0) return variant.sku;
  return axes.map((attribute) => attribute.value).join(", ");
};

/**
 * Куда возвращает кнопка «Назад в каталог». Берём slug витрины, который каталог
 * последним записал в sessionStorage; если его нет (пришли по прямой ссылке),
 * возвращаем просто `/catalog` — каталог сам подхватит дефолтную витрину.
 */
const buildCatalogBackHref = (): string => {
  if (typeof window === "undefined") return "/catalog";
  const slug = window.sessionStorage.getItem("lastCatalogPage");
  return slug ? `/catalog?catalogPage=${encodeURIComponent(slug)}` : "/catalog";
};

/**
 * Сериализуем оси варианта (size/opening/...) в стабильный ключ, чтобы при
 * переключении цвета сохранить выбранный размер: ищем в новом товаре вариант
 * с тем же набором значений по тем же осям.
 */
const serializeVariantAxes = (variant: Variant | null | undefined): string => {
  if (!variant) return "";
  return variant.attributes
    .filter((attribute) => attribute.isVariantAxis)
    .map((attribute) => `${attribute.code}=${attribute.value}`)
    .sort()
    .join("|");
};

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  // selectedId — «что показываем сейчас». Меняется на клик по чипу цвета/стекла
  // без навигации Next, только через history.replaceState (см. ниже).
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [product, setProduct] = useState<ProductData | null>(null);
  const [variantSku, setVariantSku] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  // Видимое фото: при смене цвета прогреваем новый url через off-screen `Image()`
  // и подменяем `src` только когда ресурс уже в кэше — без «пустого» кадра.
  const [displayedImage, setDisplayedImage] = useState("");
  const [isManualImageSelection, setIsManualImageSelection] = useState(false);

  // Кэш загруженных карточек по id и список «уже летящих» запросов — чтобы при
  // повторном клике/наведении не дёргать API.
  const cacheRef = useRef<Map<string, ProductData>>(new Map());
  const inFlightRef = useRef<Set<string>>(new Set());

  // Свежие значения product/variantSku нужны внутри async-fetch, чтобы корректно
  // подобрать SKU варианта в новой карточке. Через refs читаем последнее значение,
  // не пересоздавая эффект.
  const productRef = useRef<ProductData | null>(null);
  const variantSkuRef = useRef("");
  useEffect(() => { productRef.current = product; }, [product]);
  useEffect(() => { variantSkuRef.current = variantSku; }, [variantSku]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { id } = await params;
      if (cancelled) return;
      setSelectedId((prev) => prev ?? id);
    })();
    return () => { cancelled = true; };
  }, [params]);

  const applyProduct = useCallback((data: ProductData) => {
    const prev = productRef.current;
    const prevSku = variantSkuRef.current;
    let nextSku = data.variants[0]?.sku || "";
    if (prev && prevSku) {
      const prevAxes = serializeVariantAxes(prev.variants.find((v) => v.sku === prevSku));
      if (prevAxes) {
        const match = data.variants.find((v) => serializeVariantAxes(v) === prevAxes);
        if (match) nextSku = match.sku;
      }
    }
    setProduct(data);
    setVariantSku(nextSku);
    setLoading(false);
    setError("");
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const cached = cacheRef.current.get(selectedId);
    if (cached) {
      applyProduct(cached);
      return;
    }
    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch(`/api/products/${selectedId}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          setError("Товар не найден");
          setLoading(false);
          return;
        }
        const data = normalizeProductData(await response.json());
        cacheRef.current.set(selectedId, data);
        applyProduct(data);
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return;
        setError("Ошибка загрузки товара");
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [selectedId, applyProduct]);

  // Синхронизация URL без участия Next router: меняем только адресную строку,
  // никаких ре-рендеров слоёв layout/segment не происходит, скролл не сбрасывается.
  useEffect(() => {
    if (!selectedId || typeof window === "undefined") return;
    const target = `/product/${selectedId}`;
    if (window.location.pathname !== target) {
      window.history.replaceState(null, "", target);
    }
  }, [selectedId]);

  const prefetchProduct = useCallback((id: number) => {
    const idStr = String(id);
    if (cacheRef.current.has(idStr) || inFlightRef.current.has(idStr)) return;
    inFlightRef.current.add(idStr);
    fetch(`/api/products/${idStr}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j) cacheRef.current.set(idStr, normalizeProductData(j)); })
      .catch(() => {})
      .finally(() => inFlightRef.current.delete(idStr));
  }, []);

  const switchToId = useCallback((id: number) => {
    const idStr = String(id);
    setSelectedId((prev) => (prev === idStr ? prev : idStr));
  }, []);

  const selectedVariant = useMemo(
    () => product?.variants.find((item) => item.sku === variantSku) || null,
    [product?.variants, variantSku],
  );

  // Список осей варианта (size, opening и т.п.) с уникальными значениями. Порядок
  // осей — по первой встрече в `variants`, чтобы UI был стабилен между загрузками.
  const variantAxes = useMemo(() => {
    if (!product) return [] as Array<{ code: string; name: string; options: string[] }>;
    const order: string[] = [];
    const byCode = new Map<string, { code: string; name: string; options: string[] }>();
    for (const variant of product.variants) {
      for (const attribute of variant.attributes) {
        if (!attribute.isVariantAxis) continue;
        let axis = byCode.get(attribute.code);
        if (!axis) {
          axis = { code: attribute.code, name: attribute.name, options: [] };
          byCode.set(attribute.code, axis);
          order.push(attribute.code);
        }
        if (!axis.options.includes(attribute.value)) axis.options.push(attribute.value);
      }
    }
    return order.map((code) => byCode.get(code)!).filter((axis) => axis.options.length > 0);
  }, [product]);

  // Какое значение каждой оси соответствует сейчас выбранному варианту — отсюда
  // подсвечиваем активную «кнопку» в каждой группе.
  const currentAxisValues = useMemo<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    if (!selectedVariant) return out;
    for (const attribute of selectedVariant.attributes) {
      if (attribute.isVariantAxis) out[attribute.code] = attribute.value;
    }
    return out;
  }, [selectedVariant]);

  /** Цвет открытой карточки (чип или атрибут) — в корзину для дверей и погонажа. */
  const cartColorLabel = useMemo(() => {
    if (!product || selectedId == null) return "";
    const sid = Number(selectedId);
    if (!Number.isFinite(sid)) return "";
    const fromChip = product.colorVariants.find((e) => e.id === sid);
    if (fromChip?.color?.trim()) return fromChip.color.trim();
    const fromAttr = product.attributes.find((a) => a.code === "color")?.value;
    return fromAttr?.trim() || "";
  }, [product, selectedId]);

  // Клик по «кнопке» оси: пытаемся найти вариант, где совпали ВСЕ оси с новым
  // выбором; если такого нет (комбинация не существует) — берём первый вариант
  // с этим значением оси, остальные оси «подскочат» к его значениям.
  const selectAxisValue = useCallback(
    (code: string, value: string) => {
      if (!product) return;
      const desired = { ...currentAxisValues, [code]: value };
      const matchesAll = (variant: Variant) =>
        variant.attributes.every(
          (attribute) => !attribute.isVariantAxis || desired[attribute.code] === attribute.value,
        );
      const exact = product.variants.find(matchesAll);
      const fallback =
        exact ||
        product.variants.find((variant) =>
          variant.attributes.some(
            (attribute) =>
              attribute.isVariantAxis && attribute.code === code && attribute.value === value,
          ),
        );
      if (fallback) setVariantSku(fallback.sku);
    },
    [product, currentAxisValues],
  );

  const targetImage =
    selectedVariant?.image || product?.images[0] || product?.image || "";

  useEffect(() => {
    // На смене товара/варианта возвращаем авто-режим изображения по умолчанию.
    setIsManualImageSelection(false);
  }, [selectedId, variantSku]);

  useEffect(() => {
    if (!targetImage) return;
    if (isManualImageSelection && displayedImage) return;
    if (!displayedImage) {
      setDisplayedImage(targetImage);
      return;
    }
    if (targetImage === displayedImage) return;
    const preload = new window.Image();
    const swap = () => setDisplayedImage(targetImage);
    preload.onload = swap;
    preload.onerror = swap;
    preload.src = targetImage;
  }, [targetImage, displayedImage, isManualImageSelection]);

  if (loading) return <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">Загрузка...</main>;
  if (!product) return <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">{error || "Товар не найден"}</main>;

  const image = displayedImage || targetImage;
  const galleryImages =
    product.images.length > 0
      ? product.images
      : product.image
        ? [product.image]
        : [];
  const dualMainImages = galleryImages.slice(0, 2);
  const dualPhotos =
    isEntryDoorCatalogItem({ category: product.category }) &&
    dualMainImages.length === 2 &&
    dualMainImages[0] !== dualMainImages[1];
  const cartImage = dualPhotos ? dualMainImages[0] : image;
  const price = selectedVariant?.price ?? product.price;
  const selectedNumericId = Number(selectedId);
  const backHref = buildCatalogBackHref();

  return (
    <>
      <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <Link href={backHref} className="text-sm underline">
        Назад в каталог
      </Link>
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          {dualPhotos ? (
            <div
              className="grid aspect-[4/5] w-full grid-cols-2 overflow-hidden rounded-lg bg-white p-2 md:aspect-auto md:h-[620px]"
              style={{ columnGap: `${PRODUCT_DUAL_PHOTO_GAP_PX}px` }}
            >
              <div className="flex h-full items-center justify-center overflow-hidden bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={dualMainImages[0]}
                  alt={product.name}
                  className="block h-full w-full object-contain object-right drop-shadow-[0_8px_8px_rgba(0,0,0,0.14)]"
                />
              </div>
              <div className="flex h-full items-center justify-center overflow-hidden bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={dualMainImages[1]}
                  alt=""
                  className="block h-full w-full object-contain object-left drop-shadow-[0_8px_8px_rgba(0,0,0,0.14)]"
                  aria-hidden
                />
              </div>
            </div>
          ) : (
            <div className="flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-lg bg-white py-[5px] md:aspect-auto md:h-[620px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt={product.name}
              className="max-h-full max-w-full object-contain drop-shadow-[0_8px_8px_rgba(0,0,0,0.14)]"
            />
            </div>
          )}
          {galleryImages.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {galleryImages.map((url) => {
                const active = url === image;
                return (
                  <button
                    key={url}
                    type="button"
                    onClick={() => {
                      setIsManualImageSelection(true);
                      setDisplayedImage(url);
                    }}
                    className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded border bg-white p-1 ${
                      active ? "border-[#2C2CB7] ring-2 ring-[#2C2CB7]/30" : "border-zinc-200"
                    }`}
                    aria-label="Показать фото"
                    aria-pressed={active}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="max-h-full max-w-full object-contain" />
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold">{product.name}</h1>
          <p className="text-lg">{formatPrice(price)}</p>
          <p className="text-sm text-zinc-600">
            {product.category}
            {product.subcategory ? ` / ${product.subcategory}` : ""}
          </p>
          {product.colorVariants.length > 1 ? (
            <div className="space-y-2">
              <span className="text-sm text-zinc-600">Цвет</span>
              <div className="flex flex-wrap gap-2">
                {product.colorVariants.map((entry) => (
                  <VariantChip
                    key={entry.id}
                    label={entry.color || "—"}
                    image={entry.image}
                    isCurrent={entry.id === selectedNumericId}
                    onSelect={() => switchToId(entry.id)}
                    onHoverPrefetch={() => prefetchProduct(entry.id)}
                  />
                ))}
              </div>
            </div>
          ) : null}
          {product.glassVariants.length > 1 ? (
            <div className="space-y-2">
              <span className="text-sm text-zinc-600">Стекло</span>
              <div className="flex flex-wrap gap-2">
                {product.glassVariants.map((entry) => (
                  <VariantChip
                    key={entry.id}
                    label={entry.glass || "—"}
                    image={entry.image}
                    isCurrent={entry.id === selectedNumericId}
                    onSelect={() => switchToId(entry.id)}
                    onHoverPrefetch={() => prefetchProduct(entry.id)}
                  />
                ))}
              </div>
            </div>
          ) : null}
          {variantAxes.length > 0
            ? variantAxes.map((axis) => (
                <div key={axis.code} className="space-y-2">
                  <span className="text-sm text-zinc-600">{axis.name}</span>
                  <div className="flex flex-wrap gap-2">
                    {axis.options.map((value) => (
                      <VariantChip
                        key={value}
                        label={value}
                        image=""
                        isCurrent={currentAxisValues[axis.code] === value}
                        onSelect={() => selectAxisValue(axis.code, value)}
                        onHoverPrefetch={() => {}}
                      />
                    ))}
                  </div>
                </div>
              ))
            : product.variants.length > 0 && (
                <label className="block space-y-1">
                  <span className="text-sm text-zinc-600">Вариант</span>
                  <select
                    className="w-full rounded border px-3 py-2"
                    value={variantSku}
                    onChange={(event) => setVariantSku(event.target.value)}
                  >
                    {product.variants.map((variant) => (
                      <option key={variant.sku} value={variant.sku}>
                        {variantAxesLabel(variant)} — {formatPrice(variant.price)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
          <button
            className="rounded bg-[#2C2CB7] px-4 py-2 text-white transition-colors hover:bg-[#252599]"
            onClick={() => {
              cartStore.addItem({
                id: product.id,
                name: selectedVariant
                  ? `${product.name} (${variantCartSuffix(selectedVariant)})`
                  : product.name,
                image: cartImage,
                price,
                quantity: 1,
                ...(cartColorLabel ? { color: cartColorLabel } : {}),
              });
              setNotice("Товар добавлен в корзину");
              setTimeout(() => setNotice(""), 1200);
            }}
          >
            Добавить в корзину
          </button>
          {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}
          <div className="space-y-2">
            {product.attributes.map((attr) => (
              <div key={attr.code} className="flex items-start justify-between gap-3 border-b py-1 text-sm">
                <span className="min-w-0">{attr.name}</span>
                <strong className="shrink-0 text-right">{attr.value || "-"}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {product.accessories.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-xl font-semibold">Комплектующие в этом цвете</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Погонаж (наличники, коробки, доборы) с тем же идентификатором группы — подходит
            к полотну.
          </p>
          <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Наименование</th>
                  <th className="px-4 py-2 font-medium">Цена</th>
                  <th className="px-4 py-2 font-medium">Кол-во</th>
                  <th className="w-12 px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {product.accessories.map((item) => (
                  <AccessoryRow
                    key={item.id}
                    item={item}
                    doorColor={cartColorLabel}
                    onAdded={() => {
                      setNotice("Комплектующее добавлено в корзину");
                      setTimeout(() => setNotice(""), 1200);
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
      </main>
      <MeasureLeadForm />
    </>
  );
}

type VariantChipProps = {
  label: string;
  image: string;
  isCurrent: boolean;
  onSelect: () => void;
  onHoverPrefetch: () => void;
};

/**
 * Чип переключателя варианта (цвет/стекло). Это `<button>`, а не ссылка: смена
 * цвета — клиентский switch внутри одной и той же страницы, без навигации Next.
 * `aria-pressed` явно говорит a11y-стеку, что это переключатель состояния.
 * Hover/focus вызывают `onHoverPrefetch`, чтобы данные нового товара уже лежали
 * в кэше к моменту клика.
 */
function VariantChip({ label, image, isCurrent, onSelect, onHoverPrefetch }: VariantChipProps) {
  const baseClass =
    "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs";
  const stateClass = chipToneClass(isCurrent);
  const thumbBorder = isCurrent ? "border-white/30" : "border-zinc-200";
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={onHoverPrefetch}
      onFocus={onHoverPrefetch}
      aria-pressed={isCurrent}
      disabled={isCurrent}
      className={`${baseClass} ${stateClass} disabled:cursor-default`}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          className={`h-5 w-5 rounded-full border object-cover ${thumbBorder}`}
        />
      ) : null}
      {label}
    </button>
  );
}

type AccessoryRowProps = {
  item: AccessoryItem;
  /** Цвет полотна на карточке — для строки в корзине. */
  doorColor: string;
  onAdded: () => void;
};

/**
 * Одна строка таблицы комплектующих: название (+ SKU), цена, степпер количества
 * и иконка-кнопка «в корзину». После добавления поле количества не сбрасывается —
 * остаётся выбранное значение (то же число, что ушло в корзину).
 */
function AccessoryRow({ item, doorColor, onAdded }: AccessoryRowProps) {
  const [qty, setQty] = useState<number>(1);
  const clampQty = (value: number) => Math.max(1, Math.min(999, Math.floor(value) || 1));
  const dec = () => setQty((prev) => clampQty(prev - 1));
  const inc = () => setQty((prev) => clampQty(prev + 1));

  const handleAdd = () => {
    cartStore.addItem({
      id: item.id,
      name: item.name,
      image: "",
      price: item.price,
      quantity: qty,
      ...(doorColor.trim() ? { color: doorColor.trim() } : {}),
      hideCartImage: true,
    });
    onAdded();
  };

  return (
    <tr className="hover:bg-zinc-50/60">
      <td className="px-4 py-2 align-middle font-medium leading-snug text-zinc-900">
        {item.name}
      </td>
      <td className="whitespace-nowrap px-4 py-2 align-middle font-medium">
        {formatPrice(item.price)}
      </td>
      <td className="px-4 py-2 align-middle">
        <div className="inline-flex items-center overflow-hidden rounded border border-zinc-300">
          <button
            type="button"
            onClick={dec}
            className="px-2 py-1 text-sm hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={qty <= 1}
            aria-label="Уменьшить количество"
          >
            −
          </button>
          <input
            type="number"
            inputMode="numeric"
            value={qty}
            onChange={(event) => setQty(clampQty(Number(event.target.value)))}
            className="w-12 border-x border-zinc-300 px-1 py-1 text-center text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button
            type="button"
            onClick={inc}
            className="px-2 py-1 text-sm hover:bg-zinc-100"
            aria-label="Увеличить количество"
          >
            +
          </button>
        </div>
      </td>
      <td className="px-4 py-2 align-middle">
        <button
          type="button"
          onClick={handleAdd}
          aria-label={`Добавить «${item.name}» в корзину`}
          title="Добавить в корзину"
          className="inline-flex h-9 w-9 items-center justify-center rounded text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" />
            <circle cx="9" cy="20" r="1.4" />
            <circle cx="17" cy="20" r="1.4" />
          </svg>
        </button>
      </td>
    </tr>
  );
}
