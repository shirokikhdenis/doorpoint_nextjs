"use client";

import Link from "next/link";
import { useState } from "react";
import {
  buildCatalogCartItem,
  CatalogProductCard,
} from "@/features/catalog/catalog-product-card";
import { useCart } from "@/lib/client/use-cart";
import type { RelatedCollectionDoors } from "@/lib/client/normalizers";

type ProductRelatedCollectionDoorsProps = {
  relatedCollectionDoors?: RelatedCollectionDoors | null;
  variant?: "collection" | "subcategory";
};

export function ProductRelatedCollectionDoors({
  relatedCollectionDoors,
  variant = "collection",
}: ProductRelatedCollectionDoorsProps) {
  const { addItem } = useCart();
  const [hoveredProductId, setHoveredProductId] = useState<number | null>(null);

  if (!relatedCollectionDoors || relatedCollectionDoors.items.length === 0) return null;

  const { collectionName, catalogHref, items } = relatedCollectionDoors;
  const sectionId =
    variant === "subcategory" ? "product-related-subcategory-doors" : "product-related-collection-doors";
  const heading =
    variant === "subcategory" ? "Смотрите также:" : `Двери коллекции «${collectionName}»`;
  const linkLabel = variant === "subcategory" ? "Все модели →" : "Вся коллекция →";

  return (
    <section aria-labelledby={sectionId} className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={sectionId} className="text-xl font-semibold text-zinc-900">
          {heading}
        </h2>
        <Link
          href={catalogHref}
          className="inline-flex shrink-0 items-center gap-2 rounded-md border border-brand/35 bg-white px-4 py-2 text-sm font-semibold text-brand shadow-sm transition hover:border-brand hover:bg-brand/5 hover:shadow"
        >
          {linkLabel}
        </Link>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-4">
        {items.map((item) => {
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
    </section>
  );
}
