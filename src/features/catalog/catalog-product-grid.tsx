"use client";

import { useState } from "react";
import { CATALOG_CARD_IMAGE_HEIGHT } from "@/features/catalog/catalog-constants";
import {
  buildCatalogCartItem,
  CatalogProductCard,
} from "@/features/catalog/catalog-product-card";
import { useCart } from "@/lib/client/use-cart";
import type { ProductCard } from "@/lib/client/normalizers";

function CatalogProductSkeleton() {
  return (
    <div className="flex h-full flex-col rounded-lg bg-white p-2 shadow-md">
      <div className={`mb-3 ${CATALOG_CARD_IMAGE_HEIGHT} animate-pulse rounded bg-zinc-100`} />
      <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-100" />
      <div className="mt-2 h-5 w-1/3 animate-pulse rounded bg-zinc-100" />
    </div>
  );
}

type CatalogProductGridProps = {
  products: ProductCard[];
  total: number;
  loading: boolean;
  loadingMore: boolean;
  error: string;
  isRestoringReturn?: boolean;
  onLoadMore: () => void;
  onRememberScroll: () => void;
};

export function CatalogProductGrid({
  products,
  total,
  loading,
  loadingMore,
  error,
  isRestoringReturn = false,
  onLoadMore,
  onRememberScroll,
}: CatalogProductGridProps) {
  const { addItem } = useCart();
  const [hoveredProductId, setHoveredProductId] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <CatalogProductSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
        По выбранным фильтрам ничего не найдено.
      </div>
    );
  }

  return (
    <div className={isRestoringReturn ? "invisible" : undefined}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {products.map((item) => {
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
              onNavigateToProduct={onRememberScroll}
              onAddToCart={() => addItem(buildCatalogCartItem(item))}
            />
          );
        })}
      </div>
      {products.length < total ? (
        <div className="flex flex-col items-center gap-1 pt-2">
          <button
            type="button"
            onClick={onLoadMore}
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
    </div>
  );
}
