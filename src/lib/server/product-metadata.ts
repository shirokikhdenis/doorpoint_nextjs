import type { Metadata } from "next";
import { cache } from "react";
import { createRequire } from "node:module";
import { toPublicImageSrc } from "@/lib/client/image-src";
import { isPogonazhCategoryLabel } from "@/lib/pogonazh-category";
import { formatProductDisplayName } from "@/lib/product-display-name";
import { resolveProductVariantLabels } from "@/lib/product-variant-labels";
import {
  buildProductSeoDescription,
  buildProductSeoTitle,
} from "@/lib/seo-copy";
import {
  absoluteUrl,
  siteOpenGraphFields,
  SITE_TITLE,
} from "@/lib/site-seo";

const require = createRequire(import.meta.url);
const catalogService = require("@/lib/server/services/catalogService") as {
  getProductByRef: (ref: string) => Promise<Record<string, unknown> | null>;
};

export const getCachedProductByRef = cache(async (ref: string) =>
  catalogService.getProductByRef(ref),
);

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

const productDisplayName = (product: Record<string, unknown>): string => {
  const labels = resolveProductVariantLabels(product);
  return formatProductDisplayName({
    name: String(product.name || "").trim(),
    color: labels.color,
    glass: labels.glass,
    manufacturer: labels.manufacturer,
    categorySlug: String(product.categorySlug || ""),
    category: String(product.category || ""),
  });
};

export async function buildProductMetadata(ref: string): Promise<Metadata> {
  try {
    const product = await getCachedProductByRef(ref);
    if (!product?.name) {
      return { title: buildProductSeoTitle({ name: "Товар не найден" }) };
    }

    const isPogonazh = isPogonazhCategoryLabel(
      product.category as string | undefined,
      (product.categorySlug as string | undefined) ??
        (product.subcategorySlug as string | undefined),
    );
    const displayName = productDisplayName(product);
    const title = buildProductSeoTitle({
      name: displayName,
      seoTitleOverride: (product.seoTitle as string | null | undefined) ?? null,
    });
    const description = buildProductSeoDescription({
      name: displayName,
      price: product.price as number | undefined,
      category: product.category as string | undefined,
      subcategory: product.subcategory as string | undefined,
      seoDescriptionOverride:
        (product.seoDescription as string | null | undefined) ?? null,
    });
    const image = firstProductImage(product);
    const slug = String(product.slug || ref).trim() || ref;
    const productPath = `/product/${encodeURIComponent(slug)}`;

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
        ...siteOpenGraphFields(),
        title,
        description,
        url: absoluteUrl(productPath),
        ...(image ? { images: [{ url: image, alt: displayName }] } : {}),
      },
      twitter: {
        card: image ? "summary_large_image" : "summary",
        title,
        description,
        ...(image ? { images: [image] } : {}),
      },
      other: {
        "og:type": "product",
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
