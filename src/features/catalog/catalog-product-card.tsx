"use client";

import { useMemo, useState } from "react";
import { StorefrontImage } from "@/features/store/storefront-image";
import {
  catalogCardImageHeightClass,
  type CatalogCardImageHeight,
} from "@/features/catalog/catalog-constants";
import { CatalogProductLink } from "@/features/catalog/catalog-product-link";
import { ProductPricingBlock } from "@/features/product/product-pricing-block";
import { AddToCartIconButton } from "@/features/store/add-to-cart-icon-button";
import { ProductCardBadges } from "@/features/store/product-card-badges";
import { isPogonazhCategoryLabel } from "@/lib/client/cart-store";
import { formatProductDisplayName } from "@/lib/client/product-display-name";
import { isMergedStorefrontImageUrl, toPublicImageSrc } from "@/lib/client/image-src";
import type { ProductCard, ProductColorOption } from "@/lib/client/normalizers";
import { productHref } from "@/lib/client/product-url";
import { cn } from "@/lib/utils";

type CatalogProductCardProps = {
  item: ProductCard;
  showHover: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onNavigateToProduct: () => void;
  onAddToCart: (item: ProductCard) => void;
  imageHeight?: CatalogCardImageHeight;
};

export function catalogCardAllowsHover(item: ProductCard) {
  const primaryImage = toPublicImageSrc(item.image);
  const hoverImage = toPublicImageSrc(item.hoverImage);
  if (!primaryImage || !hoverImage || hoverImage === primaryImage) return false;
  return !isMergedStorefrontImageUrl(item.image);
}

const resolveActiveCard = (
  item: ProductCard,
  selectedId: number | null,
): {
  card: ProductCard;
  colorOptions: ProductColorOption[];
  selectedOption: ProductColorOption | null;
} => {
  const colorOptions = Array.isArray(item.colorOptions) ? item.colorOptions : [];
  const selectedOption =
    selectedId != null ? colorOptions.find((option) => option.id === selectedId) || null : null;

  if (!selectedOption || selectedOption.id === item.id) {
    return { card: item, colorOptions, selectedOption: selectedOption ?? null };
  }

  return {
    colorOptions,
    selectedOption,
    card: {
      ...item,
      id: selectedOption.id,
      slug: selectedOption.slug || item.slug,
      name: selectedOption.name || item.name,
      color: selectedOption.color,
      image: selectedOption.image || item.image,
      hoverImage: undefined,
      price: selectedOption.price || item.price,
      // Kit price is for the original leaf; hide until recomputed.
      kitPrice: null,
    },
  };
};

export function CatalogProductCard({
  item,
  showHover,
  onMouseEnter,
  onMouseLeave,
  onNavigateToProduct,
  onAddToCart,
  imageHeight,
}: CatalogProductCardProps) {
  const [selectedColorId, setSelectedColorId] = useState<number | null>(item.id);
  const [cardHovered, setCardHovered] = useState(false);
  const { card, colorOptions, selectedOption } = useMemo(
    () => resolveActiveCard(item, selectedColorId),
    [item, selectedColorId],
  );

  const primaryImage = toPublicImageSrc(card.image);
  const hoverImage = toPublicImageSrc(card.hoverImage);
  const switchedAway = selectedOption != null && selectedOption.id !== item.id;
  const cardImage =
    !switchedAway && showHover && hoverImage ? hoverImage : primaryImage;
  const displayName = formatProductDisplayName({
    name: card.name,
    color: card.color,
    glass: card.glass,
    manufacturer: card.manufacturer,
    categorySlug: card.categorySlug,
  });
  const imageHeightClass = catalogCardImageHeightClass(imageHeight);
  const href = productHref(card);
  const showColorSwatches = colorOptions.length > 1;
  const swatchesVisible = showColorSwatches && cardHovered;

  return (
    <article
      data-testid="catalog-product-card"
      className="group flex h-full flex-col rounded-lg bg-white p-2 shadow-md transition-shadow duration-150 hover:shadow-lg"
      onMouseEnter={() => {
        setCardHovered(true);
        onMouseEnter();
      }}
      onMouseLeave={() => {
        setCardHovered(false);
        onMouseLeave();
      }}
    >
      <div className="relative">
        <ProductCardBadges
          badges={item.badges || []}
          flagLabel={item.flagLabel}
          flagColor={item.flagColor}
        />
        <CatalogProductLink
          href={href}
          className="block"
          onBeforeNavigate={onNavigateToProduct}
        >
          <div className={`relative mb-2 ${imageHeightClass} overflow-hidden bg-white p-2`}>
            {cardImage ? (
              <StorefrontImage
                src={cardImage}
                alt={displayName}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                variant="card"
                className="object-contain object-center"
              />
            ) : null}
          </div>
        </CatalogProductLink>
        <AddToCartIconButton productName={displayName} onClick={() => onAddToCart(card)} />

        {showColorSwatches ? (
          <div
            className={cn(
              "pointer-events-none absolute right-1 top-1 z-20 flex max-h-[calc(100%-2.75rem)] flex-col items-center gap-1 overflow-y-auto rounded-md bg-white/90 p-1 shadow-sm transition-opacity duration-150",
              swatchesVisible ? "pointer-events-auto opacity-100" : "opacity-0",
            )}
            role="listbox"
            aria-label="Цвет покрытия"
            data-testid="catalog-color-swatches"
          >
            {colorOptions.map((option) => {
              const swatch = toPublicImageSrc(option.swatch) || toPublicImageSrc(option.image);
              const isSelected = (selectedColorId ?? item.id) === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  title={option.color}
                  aria-label={option.color}
                  tabIndex={swatchesVisible ? 0 : -1}
                  className={cn(
                    "h-6 w-6 shrink-0 overflow-hidden rounded border bg-zinc-50 transition",
                    isSelected
                      ? "border-brand ring-2 ring-brand/40"
                      : "border-zinc-200 hover:border-zinc-400",
                  )}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setSelectedColorId(option.id);
                  }}
                >
                  {swatch ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={swatch} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <CatalogProductLink
        href={href}
        className="mt-1 flex flex-1 flex-col"
        onBeforeNavigate={onNavigateToProduct}
      >
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm leading-snug text-zinc-900">
          {displayName}
        </h3>
        <ProductPricingBlock
          price={card.price}
          compareAtPrice={switchedAway ? null : card.compareAtPrice}
          isOnSale={switchedAway ? false : card.isOnSale}
          kitPrice={card.kitPrice}
          variant="compact"
          className="mt-2"
        />
      </CatalogProductLink>
    </article>
  );
}

export function buildCatalogCartItem(item: ProductCard) {
  return {
    id: item.id,
    name: item.name,
    image: item.image || "",
    price: item.price,
    quantity: 1,
    ...(item.sku?.trim() ? { sku: item.sku.trim() } : {}),
    ...(item.manufacturerId?.trim() ? { manufacturerId: item.manufacturerId.trim() } : {}),
    ...(item.manufacturer?.trim() ? { manufacturerName: item.manufacturer.trim() } : {}),
    ...(item.categorySlug?.trim() ? { categorySlug: item.categorySlug.trim() } : {}),
    ...(item.color?.trim() ? { color: item.color.trim() } : {}),
    ...(item.glass?.trim() ? { glass: item.glass.trim() } : {}),
    ...(isPogonazhCategoryLabel(item.category, item.categorySlug)
      ? { noProductLink: true, hideCartImage: true }
      : {}),
  };
}
