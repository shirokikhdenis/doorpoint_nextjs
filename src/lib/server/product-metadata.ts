import { createRequire } from "node:module";
import type { Metadata } from "next";
import { toPublicImageSrc } from "@/lib/client/image-src";

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

const SITE_TITLE = "Салон дверей";

const siteMetadataBase = () => {
  const raw = String(process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  if (!raw) return undefined;
  try {
    return new URL(raw.endsWith("/") ? raw : `${raw}/`);
  } catch {
    return undefined;
  }
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
      return { title: `Товар не найден — ${SITE_TITLE}` };
    }
    const categoryLine = [product.category, product.subcategory].filter(Boolean).join(" / ");
    const description = categoryLine
      ? `${product.name}. ${categoryLine}.`
      : product.name;
    const image = firstProductImage(product);
    const metadataBase = siteMetadataBase();
    return {
      ...(metadataBase ? { metadataBase } : {}),
      title: `${product.name} — ${SITE_TITLE}`,
      description,
      openGraph: {
        title: product.name,
        description,
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
