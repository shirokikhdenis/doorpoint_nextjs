"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { cartStore } from "@/lib/client/cart-store";
import { ProductData, Variant, normalizeProductData } from "@/lib/client/normalizers";

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
    </main>
  );
}
