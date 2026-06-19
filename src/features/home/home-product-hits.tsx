"use client";

import { useState } from "react";
import Link from "next/link";
import { CATALOG_CARD_IMAGE_HEIGHT } from "@/features/catalog/catalog-constants";
import {
  buildCatalogCartItem,
  CatalogProductCard,
} from "@/features/catalog/catalog-product-card";
import { useCart } from "@/lib/client/use-cart";
import { normalizeProductsResponse, type ProductCard } from "@/lib/client/normalizers";

type HomeProductHitsProps = {
  title: string;
  catalogPage: string;
  catalogHref: string;
  products: ProductCard[];
};

function HomeProductSkeleton() {
  return (
    <div className="flex h-full flex-col rounded-lg bg-white p-2 shadow-md">
      <div className={`mb-3 ${CATALOG_CARD_IMAGE_HEIGHT} animate-pulse rounded bg-zinc-100`} />
      <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-100" />
      <div className="mt-2 h-5 w-1/3 animate-pulse rounded bg-zinc-100" />
    </div>
  );
}

export function HomeProductHits({
  title,
  catalogPage,
  catalogHref,
  products,
}: HomeProductHitsProps) {
  const { addItem } = useCart();
  const [hoveredProductId, setHoveredProductId] = useState<number | null>(null);
  const [displayedProducts, setDisplayedProducts] = useState(products);
  const [loadingMore, setLoadingMore] = useState(false);
  const [canLoadMore, setCanLoadMore] = useState(products.length > 0);

  const handleShowOthers = async () => {
    if (loadingMore || !canLoadMore) return;

    setLoadingMore(true);
    try {
      const params = new URLSearchParams({
        catalogPage,
        exclude: displayedProducts.map((item) => item.id).join(","),
        count: "8",
      });
      const response = await fetch(`/api/home/product-hits?${params.toString()}`);
      if (!response.ok) return;

      const data = await response.json();
      const next = normalizeProductsResponse(data);
      if (next.length === 0) {
        setCanLoadMore(false);
        return;
      }

      setDisplayedProducts((prev) => [...prev, ...next]);
      if (next.length < 8) {
        setCanLoadMore(false);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <section aria-labelledby={`hits-${title}`} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`hits-${title}`} className="text-2xl font-bold text-zinc-900 sm:text-3xl">
          {title}
        </h2>
        <Link
          href={catalogHref}
          prefetch={false}
          className="inline-flex shrink-0 items-center gap-2 rounded-md border border-brand/35 bg-white px-5 py-2.5 text-base font-semibold text-brand shadow-sm transition hover:border-brand hover:bg-brand/5 hover:shadow"
        >
          Весь каталог →
        </Link>
      </div>

      {displayedProducts.length === 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <HomeProductSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {displayedProducts.map((item) => {
              const showHover =
                hoveredProductId === item.id &&
                Boolean(item.hoverImage && item.hoverImage !== item.image);
              return (
                <CatalogProductCard
                  key={item.id}
                  item={item}
                  showHover={showHover}
                  onMouseEnter={() => setHoveredProductId(item.id)}
                  onMouseLeave={() => setHoveredProductId(null)}
                  onNavigateToProduct={() => {}}
                  onAddToCart={() => addItem(buildCatalogCartItem(item))}
                />
              );
            })}
          </div>
          {canLoadMore ? (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => void handleShowOthers()}
                disabled={loadingMore}
                className="rounded-full border border-zinc-300 bg-white px-5 py-2 text-sm font-medium text-zinc-800 transition hover:border-zinc-500 hover:bg-zinc-50 disabled:cursor-wait disabled:opacity-60"
              >
                {loadingMore ? "Загрузка…" : "Показать ещё"}
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
