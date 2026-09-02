"use client";

import { useEffect, useState } from "react";
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
import { uniqueGalleryImages, stepGalleryImage } from "@/lib/client/gallery-step";
import { formatProductDisplayName } from "@/lib/client/product-display-name";
import { isMergedStorefrontImageUrl, toPublicImageSrc } from "@/lib/client/image-src";
import type { ProductCard } from "@/lib/client/normalizers";
import { productHref } from "@/lib/client/product-url";

type CatalogProductCardProps = {
  item: ProductCard;
  showHover: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onNavigateToProduct: () => void;
  onAddToCart: () => void;
  imageHeight?: CatalogCardImageHeight;
};

export function catalogCardAllowsHover(item: ProductCard) {
  const primaryImage = toPublicImageSrc(item.image);
  const hoverImage = toPublicImageSrc(item.hoverImage);
  if (!primaryImage || !hoverImage || hoverImage === primaryImage) return false;
  return !isMergedStorefrontImageUrl(item.image);
}

function CardPhotoNavButton({
  label,
  onClick,
  side,
}: {
  label: string;
  onClick: () => void;
  side: "left" | "right";
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      className={`absolute top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 px-2 py-1 text-sm leading-none text-white hover:bg-black/70 ${
        side === "left" ? "left-1" : "right-1"
      }`}
      aria-label={label}
    >
      {side === "left" ? "‹" : "›"}
    </button>
  );
}

export function CatalogProductCard({
  item,
  showHover,
  onMouseEnter,
  onMouseLeave,
  onNavigateToProduct,
  onAddToCart,
  imageHeight,
}: CatalogProductCardProps) {
  const primaryImage = toPublicImageSrc(item.image);
  const hoverImage = toPublicImageSrc(item.hoverImage);
  const photos = uniqueGalleryImages([primaryImage, hoverImage]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const canFlip = photos.length > 1;
  const safeIndex = photos.length > 0 ? photoIndex % photos.length : 0;
  const cardImage =
    showHover && hoverImage ? hoverImage : photos[safeIndex] || primaryImage;
  const displayName = formatProductDisplayName({
    name: item.name,
    color: item.color,
    glass: item.glass,
    manufacturer: item.manufacturer,
    categorySlug: item.categorySlug,
  });
  const imageHeightClass = catalogCardImageHeightClass(imageHeight);

  useEffect(() => {
    setPhotoIndex(0);
  }, [item.id, primaryImage, hoverImage]);

  const showPrev = () => {
    const current = photos[safeIndex] || primaryImage;
    const next = stepGalleryImage(photos, current, -1);
    setPhotoIndex(Math.max(0, photos.indexOf(next)));
  };
  const showNext = () => {
    const current = photos[safeIndex] || primaryImage;
    const next = stepGalleryImage(photos, current, 1);
    setPhotoIndex(Math.max(0, photos.indexOf(next)));
  };

  return (
    <article
      data-testid="catalog-product-card"
      className="flex h-full flex-col rounded-lg bg-white p-2 shadow-md transition-shadow duration-150 hover:shadow-lg"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="relative">
        <ProductCardBadges badges={item.badges || []} />
        <div className="relative mb-3">
          <CatalogProductLink
            href={productHref(item)}
            className="block"
            onBeforeNavigate={onNavigateToProduct}
          >
            <div className={`relative ${imageHeightClass} overflow-hidden bg-white p-2`}>
              {cardImage ? (
                <StorefrontImage
                  src={cardImage}
                  alt={item.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  variant="card"
                  className="object-contain object-center"
                />
              ) : null}
            </div>
          </CatalogProductLink>
          {canFlip ? (
            <>
              <CardPhotoNavButton label="Предыдущее фото" side="left" onClick={showPrev} />
              <CardPhotoNavButton label="Следующее фото" side="right" onClick={showNext} />
            </>
          ) : null}
          <AddToCartIconButton productName={displayName} onClick={onAddToCart} />
        </div>
      </div>
      <CatalogProductLink
        href={productHref(item)}
        className="mt-1 flex flex-1 flex-col"
        onBeforeNavigate={onNavigateToProduct}
      >
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm leading-snug text-zinc-900">{displayName}</h3>
        <ProductPricingBlock
          price={item.price}
          compareAtPrice={item.compareAtPrice}
          isOnSale={item.isOnSale}
          kitPrice={item.kitPrice}
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
