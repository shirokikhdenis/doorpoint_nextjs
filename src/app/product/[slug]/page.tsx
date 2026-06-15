import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ProductPageClient } from "@/features/product/product-page-client";
import { buildProductMetadata } from "@/lib/server/product-metadata";

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
    const { createRequire } = await import("node:module");
    const require = createRequire(import.meta.url);
    const catalogService = require("@/lib/server/services/catalogService") as {
      getProductById: (id: string) => Promise<{ slug?: string | null } | null>;
    };
    const product = await catalogService.getProductById(slug);
    if (!product?.slug) notFound();
    redirect(`/product/${product.slug}`);
  }
  return <ProductPageClient params={params} />;
}
