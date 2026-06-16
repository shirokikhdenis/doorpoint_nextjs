import type { Metadata } from "next";
import { createRequire } from "node:module";
import { toPublicImageSrc } from "@/lib/client/image-src";
import {
  absoluteUrl,
  buildPageTitle,
  defaultOpenGraph,
  SITE_TITLE,
} from "@/lib/site-seo";

const require = createRequire(import.meta.url);
const catalogService = require("@/lib/server/services/catalogService") as {
  getProductByRef: (ref: string) => Promise<{
    name?: string;
    category?: string;
    subcategory?: string;
    price?: number;
    image?: string;
    images?: string[];
  } | null>;
};

const firstProductImage = (product: {
  image?: string;
  images?: string[];
}): string => {
  const candidates = [
    ...(Array.isArray(product.images) ? product.images : []),
    product.image,
  ];
  for (const candidate of candidates) {
    const src = toPublicImageSrc(candidate != null ? String(candidate) : "");
    if (src) return src;
  }
  return "";
};

export async function buildProductMetadata(ref: string): Promise<Metadata> {
  try {
    const product = await catalogService.getProductByRef(ref);
    if (!product?.name) {
      return { title: buildPageTitle("Товар не найден") };
    }
    const categoryLine = [product.category, product.subcategory].filter(Boolean).join(" / ");
    const description = categoryLine
      ? `${product.name}. ${categoryLine}.`
      : product.name;
    const image = firstProductImage(product);
    const productPath = `/product/${encodeURIComponent(ref)}`;
    const title = buildPageTitle(product.name);
    return {
      title,
      description,
      alternates: {
        canonical: absoluteUrl(productPath),
      },
      openGraph: {
        ...defaultOpenGraph(),
        title: product.name,
        description,
        url: absoluteUrl(productPath),
        ...(image ? { images: [{ url: image, alt: product.name }] } : {}),
      },
      twitter: {
        card: image ? "summary_large_image" : "summary",
        title: product.name,
        description,
        ...(image ? { images: [image] } : {}),
      },
    };
  } catch {
    return { title: SITE_TITLE };
  }
}
