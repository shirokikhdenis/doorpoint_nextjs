import type { Metadata } from "next";
import { createRequire } from "node:module";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { ProductPageClient } from "@/features/product/product-page-client";
import { ProductJsonLd } from "@/features/product/product-json-ld";
import {
  productCategoryCatalogHref,
  productSubcategoryCatalogHref,
} from "@/features/product/product-utils";
import { StorefrontBreadcrumbs } from "@/features/store/storefront-breadcrumbs";
import { formatProductDisplayName } from "@/lib/product-display-name";
import { resolveProductVariantLabels } from "@/lib/product-variant-labels";
import { normalizeProductData } from "@/lib/client/normalizers";
import {
  buildProductMetadata,
  getCachedProductByRef,
  isPogonazhProduct,
} from "@/lib/server/product-metadata";

const require = createRequire(import.meta.url);
const catalogService = require("@/lib/server/services/catalogService") as {
  getProductById: (id: string) => Promise<{ slug?: string | null } | null>;
  getProductByRef: (ref: string) => Promise<unknown | null>;
};

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  return buildProductMetadata(slug);
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  if (/^\d+$/.test(slug)) {
    const product = await catalogService.getProductById(slug);
    if (!product?.slug) notFound();
    redirect(`/product/${product.slug}`);
  }

  const product = await getCachedProductByRef(slug);
  if (!product) notFound();
  const currentSlug = String(product.slug || "").trim();
  if (currentSlug && currentSlug !== slug) {
    permanentRedirect(`/product/${encodeURIComponent(currentSlug)}`);
  }

  const normalized = normalizeProductData(product);
  const labels = resolveProductVariantLabels(normalized);
  const displayName = formatProductDisplayName({
    name: normalized.name,
    color: labels.color,
    glass: labels.glass,
    manufacturer: labels.manufacturer,
    categorySlug: normalized.categorySlug,
    category: normalized.category,
  });
  const categoryHref = productCategoryCatalogHref(normalized.categorySlug);
  const subcategoryHref = productSubcategoryCatalogHref(
    normalized.categorySlug,
    normalized.subcategorySlug,
  );

  return (
    <>
      {!isPogonazhProduct(normalized) ? <ProductJsonLd product={normalized} /> : null}
      <div className="mx-auto w-full max-w-[1400px] px-4 pt-4 sm:px-6 lg:px-8">
        <StorefrontBreadcrumbs
          items={[
            { name: "Главная", href: "/" },
            ...(categoryHref
              ? [{ name: normalized.category || "Каталог", href: categoryHref }]
              : [{ name: "Каталог", href: "/catalog" }]),
            ...(subcategoryHref && normalized.subcategory
              ? [{ name: normalized.subcategory, href: subcategoryHref }]
              : []),
            { name: displayName },
          ]}
        />
      </div>
      <ProductPageClient params={params} initialProduct={normalized} />
    </>
  );
}
