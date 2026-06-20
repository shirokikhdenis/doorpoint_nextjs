"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProductAccessoriesTable } from "@/features/product/product-accessories-table";
import { ProductAddToCart } from "@/features/product/product-add-to-cart";
import { ProductGallery } from "@/features/product/product-gallery";
import { ProductRelatedFittings } from "@/features/product/product-related-fittings";
import { ProductSuggestedHandles } from "@/features/product/product-suggested-handles";
import { ProductVariantSelectors } from "@/features/product/product-variant-selectors";
import {
  computeInteriorKitPrice,
  productCategoryCatalogHref,
  productSubcategoryCatalogHref,
  resolveProductDisplayPrice,
  variantCartSuffix,
} from "@/features/product/product-utils";
import { useCatalogBackHref } from "@/features/product/use-catalog-back-href";
import { ProductPricingBlock } from "@/features/product/product-pricing-block";
import { ProductPageSkeleton } from "@/features/product/product-page-skeleton";
import { useProductPage } from "@/features/product/use-product-page";
import { ImageLightbox } from "@/features/store/image-lightbox";
import { MeasureLeadForm } from "@/features/store/measure-lead-form";
import type { ProductData } from "@/lib/client/normalizers";

type ProductPageClientProps = {
  params: Promise<{ slug: string }>;
  initialProduct?: ProductData | null;
};

export function ProductPageClient({ params, initialProduct }: ProductPageClientProps) {
  const page = useProductPage(params, initialProduct);
  const catalogBackHref = useCatalogBackHref();

  if (page.loading) {
    return <ProductPageSkeleton />;
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
  const price = resolveProductDisplayPrice(product, page.selectedVariant?.price);
  const kitPrice = computeInteriorKitPrice(price, product.kitPricing);
  const relatedFittings = product.relatedFittings ?? {
    fixators: [],
    latches: [],
    hinges: [],
  };
  const cartName = page.selectedVariant
    ? `${product.name} (${variantCartSuffix(page.selectedVariant)})`
    : product.name;
  const cartSku = page.selectedVariant?.sku?.trim() || product.sku?.trim() || undefined;
  const categoryHref = productCategoryCatalogHref(product.categorySlug);
  const subcategoryHref = productSubcategoryCatalogHref(
    product.categorySlug,
    product.subcategorySlug,
  );
  const taxonomyLinkClass =
    "text-zinc-600 transition hover:text-brand hover:underline underline-offset-2";

  return (
    <>
      <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        <Button
          variant="outline"
          size="sm"
          asChild
          className="border-zinc-300 text-zinc-800 hover:border-brand/35 hover:bg-brand/5 hover:text-brand"
        >
          <Link href={catalogBackHref} scroll={false}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
            Назад в каталог
          </Link>
        </Button>
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
            <p className="text-sm text-zinc-600">
              {product.category ? (
                categoryHref ? (
                  <Link href={categoryHref} className={taxonomyLinkClass}>
                    {product.category}
                  </Link>
                ) : (
                  product.category
                )
              ) : null}
              {product.subcategory ? (
                <>
                  {product.category ? " / " : null}
                  {subcategoryHref ? (
                    <Link href={subcategoryHref} className={taxonomyLinkClass}>
                      {product.subcategory}
                    </Link>
                  ) : (
                    product.subcategory
                  )}
                </>
              ) : null}
            </p>
            <h1 className="text-2xl font-semibold">{product.name}</h1>
            <ProductPricingBlock
              price={price}
              compareAtPrice={product.compareAtPrice}
              isOnSale={product.isOnSale}
              kitPrice={kitPrice}
              kitPricing={product.kitPricing}
            />
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
        <ProductSuggestedHandles handles={product.suggestedHandles ?? []} />
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
