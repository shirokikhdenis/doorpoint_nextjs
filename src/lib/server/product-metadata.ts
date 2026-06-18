import type { Metadata } from "next";
import { createRequire } from "node:module";
import { toPublicImageSrc } from "@/lib/client/image-src";
import { isPogonazhCategoryLabel } from "@/lib/pogonazh-category";
import {
  buildProductSeoDescription,
  buildProductSeoTitle,
} from "@/lib/seo-copy";
import {
  absoluteUrl,
  defaultOpenGraph,
  SITE_TITLE,
} from "@/lib/site-seo";

const require = createRequire(import.meta.url);
const catalogService = require("@/lib/server/services/catalogService") as {
  getProductByRef: (ref: string) => Promise<{
    name?: string;
    category?: string;
    subcategory?: string;
    categorySlug?: string;
    subcategorySlug?: string;
    price?: number;
    image?: string;
    images?: string[];
    seoTitle?: string | null;
    seoDescription?: string | null;
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
      return { title: buildProductSeoTitle({ name: "Товар не найден" }) };
    }

    const isPogonazh = isPogonazhCategoryLabel(
      product.category,
      product.categorySlug ?? product.subcategorySlug,
    );
    const title = buildProductSeoTitle({
      name: product.name,
      seoTitleOverride: product.seoTitle,
    });
    const description = buildProductSeoDescription({
      name: product.name,
      price: product.price,
      category: product.category,
      subcategory: product.subcategory,
      seoDescriptionOverride: product.seoDescription,
    });
    const image = firstProductImage(product);
    const productPath = `/product/${encodeURIComponent(ref)}`;

    return {
      title,
      description,
      ...(isPogonazh
        ? {
            robots: {
              index: false,
              follow: false,
            },
          }
        : {}),
      alternates: {
        canonical: absoluteUrl(productPath),
      },
      openGraph: {
        ...defaultOpenGraph(),
        title,
        description,
        url: absoluteUrl(productPath),
        ...(image ? { images: [{ url: image, alt: product.name }] } : {}),
      },
      twitter: {
        card: image ? "summary_large_image" : "summary",
        title,
        description,
        ...(image ? { images: [image] } : {}),
      },
    };
  } catch {
    return { title: SITE_TITLE };
  }
}

export function isPogonazhProduct(product: {
  category?: string | null;
  categorySlug?: string | null;
  subcategorySlug?: string | null;
}): boolean {
  return isPogonazhCategoryLabel(
    product.category,
    product.categorySlug ?? product.subcategorySlug,
  );
}
