import type { Metadata } from "next";
import { createRequire } from "node:module";
import { notFound, redirect } from "next/navigation";
import { ProductPageClient } from "@/features/product/product-page-client";
import { ProductJsonLd } from "@/features/product/product-json-ld";
import { normalizeProductData } from "@/lib/client/normalizers";
import { buildProductMetadata } from "@/lib/server/product-metadata";

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

  const product = await catalogService.getProductByRef(slug);
  if (!product) notFound();

  const normalized = normalizeProductData(product);

  return (
    <>
      <ProductJsonLd product={normalized} />
      <ProductPageClient params={params} initialProduct={normalized} />
    </>
  );
}
