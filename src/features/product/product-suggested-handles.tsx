"use client";

import Link from "next/link";
import { useState } from "react";
import { catalogGridClass } from "@/features/catalog/catalog-constants";
import {
  buildCatalogCartItem,
  catalogCardAllowsHover,
  CatalogProductCard,
} from "@/features/catalog/catalog-product-card";
import { useCart } from "@/lib/client/use-cart";
import type { ProductCard } from "@/lib/client/normalizers";
import { CATALOG_PAGE_SLUG } from "@/lib/catalog-page-slugs";
import { buildCatalogPublicHrefFromFlat } from "@/lib/catalog-url";

const HANDLES_CATALOG_HREF = buildCatalogPublicHrefFromFlat(CATALOG_PAGE_SLUG.fittings, {
  subcategories: "handles,ручки",
});

type ProductSuggestedHandlesProps = {
  handles: ProductCard[];
  cardsPerRow?: number;
};

export function ProductSuggestedHandles({ handles, cardsPerRow }: ProductSuggestedHandlesProps) {
  const { addItem } = useCart();
  const [hoveredProductId, setHoveredProductId] = useState<number | null>(null);

  if (handles.length === 0) return null;

  return (
    <section aria-labelledby="product-suggested-handles" className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="product-suggested-handles" className="text-xl font-semibold text-zinc-900">
          Выберите ручки
        </h2>
        <Link
          href={HANDLES_CATALOG_HREF}
          className="inline-flex shrink-0 items-center gap-2 rounded-md border border-brand/35 bg-white px-4 py-2 text-sm font-semibold text-brand shadow-sm transition hover:border-brand hover:bg-brand/5 hover:shadow"
        >
          Все ручки →
        </Link>
      </div>
      <div className={`mt-5 ${catalogGridClass(cardsPerRow ?? 6)}`}>
        {handles.map((item) => {
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
              imageHeight="compact"
            />
          );
        })}
      </div>
    </section>
  );
}
