"use client";

import Link from "next/link";
import { ProductAccessoriesTable } from "@/features/product/product-accessories-table";
import { ProductAddToCart } from "@/features/product/product-add-to-cart";
import { ProductGallery } from "@/features/product/product-gallery";
import { ProductRelatedFittings } from "@/features/product/product-related-fittings";
import { ProductVariantSelectors } from "@/features/product/product-variant-selectors";
import {
  buildCatalogBackHref,
  variantCartSuffix,
} from "@/features/product/product-utils";
import { useProductPage } from "@/features/product/use-product-page";
import { ImageLightbox } from "@/features/store/image-lightbox";
import { MeasureLeadForm } from "@/features/store/measure-lead-form";
import { PriceTag } from "@/features/store/price-tag";

type ProductPageClientProps = {
  params: Promise<{ slug: string }>;
};

export function ProductPageClient({ params }: ProductPageClientProps) {
  const page = useProductPage(params);

  if (page.loading) {
    return (
      <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        Загрузка...
      </main>
    );
  }

  if (!page.product) {
    return (
      <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        {page.error || "Товар не найден"}
      </main>
    );
  }

  const product = page.product;
  const image = page.displayedImage || page.targetImage;
  const galleryImages =
    product.images.length > 0 ? product.images : product.image ? [product.image] : [];
  const price = page.selectedVariant?.price ?? product.price;
  const relatedFittings = product.relatedFittings ?? {
    fixators: [],
    latches: [],
    hinges: [],
  };
  const cartName = page.selectedVariant
    ? `${product.name} (${variantCartSuffix(page.selectedVariant)})`
    : product.name;
  const cartSku = page.selectedVariant?.sku?.trim() || product.sku?.trim() || undefined;

  return (
    <>
      <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        <Link href={buildCatalogBackHref()} className="text-sm underline">
          Назад в каталог
        </Link>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <ProductGallery
            productName={product.name}
            image={image}
            galleryImages={galleryImages}
            onOpenLightbox={() => page.setImageLightboxOpen(true)}
            onSelectThumbnail={(url) => {
              page.setIsManualImageSelection(true);
              page.setDisplayedImage(url);
            }}
          />
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold">{product.name}</h1>
            <PriceTag price={price} className="text-lg" />
            <p className="text-sm text-zinc-600">
              {product.category}
              {product.subcategory ? ` / ${product.subcategory}` : ""}
            </p>
            <ProductVariantSelectors
              product={product}
              selectedNumericId={page.selectedNumericId}
              variantSku={page.variantSku}
              variantAxes={page.variantAxes}
              currentAxisValues={page.currentAxisValues}
              onSwitchToSlug={page.switchToSlug}
              onPrefetch={page.prefetchProduct}
              onSelectAxisValue={page.selectAxisValue}
              onVariantSkuChange={page.setVariantSku}
            />
            <ProductAddToCart
              productId={product.id}
              cartName={cartName}
              cartColorLabel={page.cartColorLabel}
              cartImage={image}
              price={price}
              sku={cartSku}
            />
            <div className="space-y-2">
              {product.attributes.map((attr) => (
                <div
                  key={attr.code}
                  className="flex items-start justify-between gap-3 border-b py-1 text-sm"
                >
                  <span className="min-w-0">{attr.name}</span>
                  <strong className="shrink-0 text-right">{attr.value || "-"}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        <ProductRelatedFittings relatedFittings={relatedFittings} />
        <ProductAccessoriesTable
          accessories={product.accessories}
          doorColor={page.cartColorLabel}
        />
      </main>
      <ImageLightbox
        src={image}
        alt={product.name}
        open={page.imageLightboxOpen}
        onClose={() => page.setImageLightboxOpen(false)}
      />
      <MeasureLeadForm />
    </>
  );
}
