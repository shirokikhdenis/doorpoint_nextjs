"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProductAccessoriesTable } from "@/features/product/product-accessories-table";
import { ProductAddToCart, ProductCartRequestLink } from "@/features/product/product-add-to-cart";
import { ProductAddToExhibition } from "@/features/product/product-add-to-exhibition";
import { ProductFinishSelector } from "@/features/product/product-finish-selector";
import { ProductGlassUpgradeSelector } from "@/features/product/product-glass-upgrade-selector";
import { ProductHardwareServicesSelector } from "@/features/product/product-hardware-services-selector";
import { getFinishPickerPlacement } from "@/lib/door-finish-picker-templates.js";
import { ProductGallery } from "@/features/product/product-gallery";
import { ProductRelatedCollectionDoors } from "@/features/product/product-related-collection-doors";
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
import { ProductManufacturerLogo } from "@/features/product/product-manufacturer-logo";
import { ProductPageSkeleton } from "@/features/product/product-page-skeleton";
import { useProductPage } from "@/features/product/use-product-page";
import { formatProductDisplayName, isBravoInteriorDoor } from "@/lib/client/product-display-name";
import { ImageLightbox } from "@/features/store/image-lightbox";
import { MeasureLeadForm } from "@/features/store/measure-lead-form";
import { TrackedPhoneLink } from "@/features/store/tracked-phone-link";
import type { ProductData } from "@/lib/client/normalizers";
import { SITE_PHONE_DISPLAY } from "@/lib/site-contact";

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
  const basePrice = resolveProductDisplayPrice(
    product,
    page.selectedVariant?.price,
    product.variants,
  );
  const finishDelta = page.selectedFinish?.priceDelta ?? 0;
  const glassDelta = page.selectedGlassOption?.priceDelta ?? 0;
  const hardwareDelta = page.selectedHardwareServices.reduce((sum, item) => sum + item.price, 0);
  const price = basePrice + finishDelta + glassDelta + hardwareDelta;
  const kitPrice = computeInteriorKitPrice(price, product.kitPricing);
  const relatedFittings = product.relatedFittings ?? { items: [] };
  const cartVariantSuffix = page.selectedVariant
    ? variantCartSuffix(page.selectedVariant)
    : "";
  const cartName = cartVariantSuffix
    ? `${product.name} (${cartVariantSuffix})`
    : product.name;
  const pageTitle = isBravoInteriorDoor({
    manufacturer: product.manufacturerName,
    categorySlug: product.categorySlug,
  })
    ? formatProductDisplayName({
        name: product.name,
        color: page.cartColorLabel,
        glass: page.cartGlassLabel,
        manufacturer: product.manufacturerName,
        categorySlug: product.categorySlug,
      })
    : product.name;
  const cartSku = page.selectedVariant?.sku?.trim() || product.sku?.trim() || undefined;
  const cartManufacturerId =
    page.selectedVariant?.manufacturerId?.trim() || product.manufacturerId?.trim() || undefined;
  const exhibitionCoatingColor =
    page.selectedFinish?.name?.trim() || page.cartColorLabel?.trim() || "";
  const categoryHref = productCategoryCatalogHref(product.categorySlug);
  const subcategoryHref = productSubcategoryCatalogHref(
    product.categorySlug,
    product.subcategorySlug,
  );
  const taxonomyLinkClass =
    "text-zinc-600 transition hover:text-brand hover:underline underline-offset-2";
  const finishPickerId = product.finishOptions?.pickerTemplateId ?? null;
  const showFinishPicker = product.finishOptions != null && finishPickerId != null;
  const finishPickerProps = showFinishPicker
    ? {
        finishOptions: product.finishOptions!,
        selectedFinish: page.selectedFinish,
        onSelectFinish: page.setSelectedFinish,
      }
    : null;
  const finishPickerPlacement = finishPickerId ? getFinishPickerPlacement(finishPickerId) : null;
  const cartLineProps = {
    productId: product.id,
    cartName,
    cartColorLabel: page.cartColorLabel,
    cartGlassLabel: page.cartGlassLabel,
    cartImage: image,
    price,
    sku: cartSku,
    manufacturerId: cartManufacturerId,
    manufacturerName: product.manufacturerName,
    categorySlug: product.categorySlug,
    finishId: page.selectedFinish?.id,
    finishName: page.selectedFinish?.name,
    glassOptionId: page.selectedGlassOption?.id,
    glassOptionName: page.selectedGlassOption?.name,
    hardwareServices: page.selectedHardwareServices.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
    })),
    requiresFinish: page.requiresFinish,
  };

  return (
    <>
      <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="relative">
          {product.manufacturerLogo ? (
            <ProductManufacturerLogo
              logoUrl={product.manufacturerLogo}
              manufacturerName={product.manufacturerName || "Производитель"}
            />
          ) : null}
          <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="border-zinc-300 text-zinc-800 hover:border-brand/35 hover:bg-brand/5 hover:text-brand"
            >
              <Link href={catalogBackHref} scroll={false} data-testid="product-back-to-catalog">
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
          </div>
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
            <h1 className="text-2xl font-semibold">{pageTitle}</h1>
            <ProductAddToExhibition
              productId={product.id}
              categorySlug={product.categorySlug}
              coatingColor={exhibitionCoatingColor}
              productSku={cartSku}
              price={price}
              kitPrice={kitPrice}
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
            {page.glassItems.length > 0 ? (
              <ProductGlassUpgradeSelector
                items={page.glassItems}
                selectedGlassOption={page.selectedGlassOption}
                onSelectGlassOption={page.setSelectedGlassOption}
              />
            ) : null}
            {finishPickerProps && finishPickerPlacement === "sidebar" ? (
              <ProductFinishSelector placement="sidebar" {...finishPickerProps} />
            ) : null}
            {product.hardwareServiceOptions?.items.length ? (
              <ProductHardwareServicesSelector
                items={product.hardwareServiceOptions.items}
                selectedServiceIds={page.selectedHardwareServiceIds}
                onToggleService={page.toggleHardwareService}
              />
            ) : null}
            <div className="flex flex-col gap-3 border-t border-zinc-100 pt-4">
              <ProductPricingBlock
                price={price}
                compareAtPrice={product.compareAtPrice}
                isOnSale={product.isOnSale}
                kitPrice={kitPrice}
                kitPricing={product.kitPricing}
              />
              <ProductAddToCart {...cartLineProps} className="w-full" />
            </div>
            <div className="flex items-start gap-2.5 rounded-lg bg-zinc-50 px-3 py-2 sm:items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mt-0.5 h-4 w-4 shrink-0 text-brand sm:mt-0"
                aria-hidden="true"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <p className="min-w-0 text-sm text-zinc-600">
                <span className="block sm:inline">Есть вопросы? Позвоните нам</span>{" "}
                <TrackedPhoneLink className="inline-block whitespace-nowrap font-semibold text-brand hover:underline sm:inline">
                  {SITE_PHONE_DISPLAY}
                </TrackedPhoneLink>
                <span className="mt-1 block sm:mt-0 sm:inline">
                  {" "}
                  или <ProductCartRequestLink {...cartLineProps} /> и мы вам перезвоним
                </span>
              </p>
            </div>
            {product.attributes.length > 0 ? (
            <div className="mt-8 border-t border-zinc-200 pt-6">
              <h2 className="text-lg font-semibold text-zinc-900">Характеристики</h2>
            <div className="mt-3 space-y-0">
              {product.attributes.map((attr) => (
                <div
                  key={attr.code}
                  className="grid grid-cols-1 gap-x-4 gap-y-1 border-b border-zinc-200 py-2 text-sm sm:grid-cols-[minmax(9rem,38%)_1fr]"
                >
                  <span className="text-zinc-600">{attr.name}</span>
                  <strong className="min-w-0 break-words font-medium sm:text-right">
                    {attr.value || "-"}
                  </strong>
                </div>
              ))}
            </div>
            </div>
            ) : null}
          </div>
        </div>
        </div>

        <ProductRelatedFittings
          relatedFittings={relatedFittings}
          cardsPerRow={product.relatedFittingsCardsPerRow}
        />
        {finishPickerProps && finishPickerPlacement === "below-card" ? (
          <ProductFinishSelector placement="below-card" {...finishPickerProps} />
        ) : null}
        <ProductAccessoriesTable
          accessories={product.accessories}
          doorColor={page.cartColorLabel}
        />
        <ProductSuggestedHandles
          handles={product.suggestedHandles ?? []}
          cardsPerRow={product.suggestedHandlesCardsPerRow}
        />
        <ProductRelatedCollectionDoors
          relatedCollectionDoors={product.relatedCollectionDoors}
          cardsPerRow={product.collectionDoorsCardsPerRow}
        />
        <ProductRelatedCollectionDoors
          relatedCollectionDoors={product.relatedSubcategoryDoors}
          variant="subcategory"
          cardsPerRow={product.subcategoryDoorsCardsPerRow}
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
