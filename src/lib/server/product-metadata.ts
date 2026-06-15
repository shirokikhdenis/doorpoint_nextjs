import { createRequire } from "node:module";
import type { Metadata } from "next";

const require = createRequire(import.meta.url);
const catalogService = require("@/lib/server/services/catalogService") as {
  getProductByRef: (ref: string) => Promise<{
    name?: string;
    category?: string;
    subcategory?: string;
    price?: number;
  } | null>;
};

const SITE_TITLE = "Салон дверей";

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
    return {
      title: `${product.name} — ${SITE_TITLE}`,
      description,
    };
  } catch {
    return { title: SITE_TITLE };
  }
}
