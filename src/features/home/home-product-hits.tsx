"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  catalogCardImageHeightClass,
  catalogGridClass,
  type CatalogCardImageHeight,
} from "@/features/catalog/catalog-constants";
import { cn } from "@/lib/utils";
import {
  buildCatalogCartItem,
  catalogCardAllowsHover,
  CatalogProductCard,
} from "@/features/catalog/catalog-product-card";
import { useCart } from "@/lib/client/use-cart";
import { normalizeProductsResponse, type ProductCard } from "@/lib/client/normalizers";

type HomeProductHitsProps = {
  title: string;
  catalogPage: string;
  catalogHref: string;
  products: ProductCard[];
  sectionId?: number;
  loadMoreCount?: number;
  variant?: "default" | "muted";
  cardsPerRow?: number;
  cardImageHeight?: CatalogCardImageHeight;
};

function HomeProductSkeleton({ imageHeight }: { imageHeight?: CatalogCardImageHeight }) {
  return (
    <div className="flex h-full flex-col rounded-lg bg-white p-2 shadow-md">
      <div className={`mb-3 ${catalogCardImageHeightClass(imageHeight)} animate-pulse rounded bg-zinc-100`} />
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
  sectionId,
  loadMoreCount = 8,
  variant = "default",
  cardsPerRow = 4,
  cardImageHeight,
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
      const exclude = displayedProducts.map((item) => item.id).join(",");
      const params = new URLSearchParams({
        exclude,
        count: String(loadMoreCount),
      });
      const url = sectionId
        ? `/api/home/sections/${sectionId}/products?${params.toString()}`
        : `/api/home/product-hits?${new URLSearchParams({
            catalogPage,
            exclude,
            count: String(loadMoreCount),
          }).toString()}`;
      const response = await fetch(url);
      if (!response.ok) return;

      const data = await response.json();
      const next = normalizeProductsResponse(data);
      if (next.length === 0) {
        setCanLoadMore(false);
        return;
      }

      setDisplayedProducts((prev) => [...prev, ...next]);
      if (next.length < loadMoreCount) {
        setCanLoadMore(false);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <section
      aria-labelledby={`hits-${title}`}
      className={cn(
        "space-y-5",
        variant === "muted" && "rounded-xl bg-zinc-50/80 p-4 sm:p-6",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`hits-${title}`} className="text-2xl font-bold text-zinc-900 sm:text-3xl">
          {title}
        </h2>
        <Button variant="outline" size="lg" className="shrink-0 border-brand/35 text-brand hover:bg-brand/5" asChild>
          <Link href={catalogHref} prefetch={false}>
            Весь каталог →
          </Link>
        </Button>
      </div>

      {displayedProducts.length === 0 ? (
        <div className={catalogGridClass(cardsPerRow, catalogPage)}>
          {Array.from({ length: 8 }, (_, i) => (
            <HomeProductSkeleton key={i} imageHeight={cardImageHeight} />
          ))}
        </div>
      ) : (
        <>
          <div className={catalogGridClass(cardsPerRow, catalogPage)}>
            {displayedProducts.map((item) => {
              const showHover = hoveredProductId === item.id && catalogCardAllowsHover(item);
              return (
                <CatalogProductCard
                  key={item.id}
                  item={item}
                  showHover={showHover}
                  onMouseEnter={() => setHoveredProductId(item.id)}
                  onMouseLeave={() => setHoveredProductId(null)}
                  onNavigateToProduct={() => {}}
                  onAddToCart={() => addItem(buildCatalogCartItem(item))}
                  imageHeight={cardImageHeight}
                />
              );
            })}
          </div>
          {canLoadMore ? (
            <div className="flex justify-center pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => void handleShowOthers()}
                disabled={loadingMore}
                className="rounded-full"
              >
                {loadingMore ? "Загрузка…" : "Показать ещё"}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
