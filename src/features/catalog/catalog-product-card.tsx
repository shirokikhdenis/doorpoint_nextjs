import Link from "next/link";
import { StorefrontImage } from "@/features/store/storefront-image";
import { CATALOG_CARD_IMAGE_HEIGHT } from "@/features/catalog/catalog-constants";
import { CatalogProductLink } from "@/features/catalog/catalog-product-link";
import { AddToCartIconButton } from "@/features/store/add-to-cart-icon-button";
import { ProductPrice } from "@/features/store/price-tag";
import { ProductCardBadges } from "@/features/store/product-card-badges";
import { isPogonazhCategoryLabel } from "@/lib/client/cart-store";
import { toPublicImageSrc } from "@/lib/client/image-src";
import type { ProductCard } from "@/lib/client/normalizers";
import { productHref } from "@/lib/client/product-url";

type CatalogProductCardProps = {
  item: ProductCard;
  showHover: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onNavigateToProduct: () => void;
  onAddToCart: () => void;
};

export function CatalogProductCard({
  item,
  showHover,
  onMouseEnter,
  onMouseLeave,
  onNavigateToProduct,
  onAddToCart,
}: CatalogProductCardProps) {
  const primaryImage = toPublicImageSrc(item.image);
  const hoverImage = toPublicImageSrc(item.hoverImage);
  const cardImage = showHover && hoverImage ? hoverImage : primaryImage;
  const displayName = item.color ? `${item.name} ${item.color}` : item.name;

  return (
    <article
      className="flex h-full flex-col rounded-lg bg-white p-2 shadow-md transition-shadow duration-150 hover:shadow-lg"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="relative">
        <ProductCardBadges badges={item.badges || []} />
        <CatalogProductLink
          href={productHref(item)}
          className="block"
          onBeforeNavigate={onNavigateToProduct}
        >
          <div
            className={`relative mb-3 ${CATALOG_CARD_IMAGE_HEIGHT} overflow-hidden bg-white p-2`}
          >
            {cardImage ? (
              <StorefrontImage
                src={cardImage}
                alt={item.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-contain object-center"
              />
            ) : null}
          </div>
        </CatalogProductLink>
        <AddToCartIconButton productName={displayName} onClick={onAddToCart} />
      </div>
      <CatalogProductLink
        href={productHref(item)}
        className="mt-1 flex flex-1 flex-col"
        onBeforeNavigate={onNavigateToProduct}
      >
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm leading-snug text-zinc-900">{displayName}</h3>
        <ProductPrice
          price={item.price}
          compareAtPrice={item.compareAtPrice}
          isOnSale={item.isOnSale}
          layout="stacked"
          className="mt-2 text-base font-medium text-zinc-800"
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
    ...(item.color?.trim() ? { color: item.color.trim() } : {}),
    ...(isPogonazhCategoryLabel(item.category, item.categorySlug)
      ? { noProductLink: true, hideCartImage: true }
      : {}),
  };
}
