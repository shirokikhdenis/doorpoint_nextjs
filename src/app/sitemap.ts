import type { MetadataRoute } from "next";
import { createRequire } from "node:module";
import { normalizeCatalogPages } from "@/lib/client/normalizers";
import { absoluteUrl } from "@/lib/site-seo";

const require = createRequire(import.meta.url);
const catalogService = require("@/lib/server/services/catalogService") as {
  listCatalogPages: () => Promise<unknown[]>;
  listActiveProductSlugs: () => Promise<string[]>;
};

const STATIC_PATHS = [
  "/",
  "/catalog",
  "/contact",
  "/uslugi",
  "/portfolio",
  "/privacy",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.8,
  }));

  try {
    const [catalogPages, productSlugs] = await Promise.all([
      catalogService.listCatalogPages(),
      catalogService.listActiveProductSlugs(),
    ]);

    for (const page of normalizeCatalogPages(catalogPages)) {
      if (!page.slug || page.slug === "all") continue;
      entries.push({
        url: absoluteUrl(`/catalog?catalogPage=${encodeURIComponent(page.slug)}`),
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.9,
      });
    }

    for (const slug of productSlugs) {
      entries.push({
        url: absoluteUrl(`/product/${encodeURIComponent(slug)}`),
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch {
    // sitemap still returns static routes if DB is unavailable
  }

  return entries;
}
