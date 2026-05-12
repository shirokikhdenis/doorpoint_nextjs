"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { cartStore } from "@/lib/client/cart-store";
import {
  AccessoryItem,
  ProductData,
  Variant,
  normalizeProductData,
} from "@/lib/client/normalizers";

const formatPrice = (price: number) => `${Number(price || 0).toLocaleString("ru-RU")} ₽`;

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

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const [product, setProduct] = useState<ProductData | null>(null);
  const [variantSku, setVariantSku] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      const { id } = await params;
      const response = await fetch(`/api/products/${id}`);
      if (!response.ok) {
        setError("Товар не найден");
        setLoading(false);
        return;
      }
      const data = normalizeProductData(await response.json());
      setProduct(data);
      if (data.variants.length > 0) setVariantSku(data.variants[0].sku);
      setLoading(false);
    };
    run().catch(() => {
      setError("Ошибка загрузки товара");
      setLoading(false);
    });
  }, [params]);

  const selectedVariant = useMemo(
    () => product?.variants.find((item) => item.sku === variantSku) || null,
    [product?.variants, variantSku],
  );

  if (loading) return <main className="mx-auto w-full max-w-5xl p-6">Загрузка...</main>;
  if (!product) return <main className="mx-auto w-full max-w-5xl p-6">{error || "Товар не найден"}</main>;

  const image = selectedVariant?.image || product.images[0] || product.image || "";
  const price = selectedVariant?.price ?? product.price;

  return (
    <main className="mx-auto w-full max-w-5xl p-6">
      <Link href="/catalog" className="text-sm underline">
        Назад в каталог
      </Link>
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <div className="py-[5px] flex h-[600px] w-full items-center justify-center overflow-hidden rounded-lg border bg-zinc-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={product.name}
            className="max-h-full max-w-full object-contain"
          />
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
                {product.colorVariants.map((entry) => {
                  const label = entry.color || "—";
                  const baseClass =
                    "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition";
                  if (entry.isCurrent) {
                    return (
                      <span
                        key={entry.id}
                        className={`${baseClass} border-zinc-900 bg-zinc-900 text-white`}
                        aria-current="true"
                      >
                        {entry.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={entry.image}
                            alt=""
                            className="h-5 w-5 rounded-full border border-white/30 object-cover"
                          />
                        ) : null}
                        {label}
                      </span>
                    );
                  }
                  return (
                    <Link
                      key={entry.id}
                      href={`/product/${entry.id}`}
                      className={`${baseClass} border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50`}
                    >
                      {entry.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={entry.image}
                          alt=""
                          className="h-5 w-5 rounded-full border border-zinc-200 object-cover"
                        />
                      ) : null}
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}
          {product.glassVariants.length > 1 ? (
            <div className="space-y-2">
              <span className="text-sm text-zinc-600">Стекло</span>
              <div className="flex flex-wrap gap-2">
                {product.glassVariants.map((entry) => {
                  const label = entry.glass || "—";
                  const baseClass =
                    "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition";
                  if (entry.isCurrent) {
                    return (
                      <span
                        key={entry.id}
                        className={`${baseClass} border-zinc-900 bg-zinc-900 text-white`}
                        aria-current="true"
                      >
                        {entry.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={entry.image}
                            alt=""
                            className="h-5 w-5 rounded-full border border-white/30 object-cover"
                          />
                        ) : null}
                        {label}
                      </span>
                    );
                  }
                  return (
                    <Link
                      key={entry.id}
                      href={`/product/${entry.id}`}
                      className={`${baseClass} border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50`}
                    >
                      {entry.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={entry.image}
                          alt=""
                          className="h-5 w-5 rounded-full border border-zinc-200 object-cover"
                        />
                      ) : null}
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}
          {product.variants.length > 0 && (
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
            className="rounded bg-black px-4 py-2 text-white"
            onClick={() => {
              cartStore.addItem({
                id: product.id,
                name: selectedVariant
                  ? `${product.name} (${variantCartSuffix(selectedVariant)})`
                  : product.name,
                image,
                price,
                quantity: 1,
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
              <div key={attr.code} className="flex justify-between border-b py-1 text-sm">
                <span>{attr.name}</span>
                <strong>{attr.value || "-"}</strong>
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
  );
}

type AccessoryRowProps = {
  item: AccessoryItem;
  onAdded: () => void;
};

/**
 * Одна строка таблицы комплектующих: название (+ SKU), цена, степпер количества
 * и иконка-кнопка «в корзину». Количество хранится локально внутри строки,
 * добавляется в `cartStore` одной порцией, после чего сбрасывается обратно к 1.
 */
function AccessoryRow({ item, onAdded }: AccessoryRowProps) {
  const [qty, setQty] = useState<number>(1);
  const clampQty = (value: number) => Math.max(1, Math.min(999, Math.floor(value) || 1));
  const dec = () => setQty((prev) => clampQty(prev - 1));
  const inc = () => setQty((prev) => clampQty(prev + 1));

  const handleAdd = () => {
    cartStore.addItem({
      id: item.id,
      name: item.name,
      image: item.image,
      price: item.price,
      quantity: qty,
    });
    onAdded();
    setQty(1);
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
