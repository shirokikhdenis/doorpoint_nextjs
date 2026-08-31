import type { MetadataRoute } from "next";
import { createRequire } from "node:module";
import { normalizeCatalogPages } from "@/lib/client/normalizers";
import { isPogonazhCatalogPageSlug } from "@/lib/pogonazh-category";
import { catalogPagePath } from "@/lib/catalog-page-paths";
import { FACTORY_SECTIONS } from "@/lib/factory-sections-config";
import { manufacturerCollectionsPath } from "@/lib/factory-sections";
import { manufacturerCatalogPath } from "@/lib/manufacturer-catalog-path";
import { absoluteUrl } from "@/lib/site-seo";

const require = createRequire(import.meta.url);
const catalogService = require("@/lib/server/services/catalogService") as {
  listCatalogPages: () => Promise<unknown[]>;
  listActiveProductSlugs: () => Promise<string[]>;
};
const factoryStorefrontService = require("@/lib/server/services/factoryStorefrontService") as {
  listPublicFactorySections: () => Promise<
    Array<{ id: string; factories: Array<{ name: string }> }>
  >;
};
const portfolioService = require("@/lib/server/services/portfolioService") as {
  listPublicPortfolio: () => Promise<Array<{ id: number }>>;
};

const STATIC_PATHS = [
  "/",
  "/catalog",
  "/contact",
  "/uslugi",
  "/portfolio",
  "/fabriki",
  "/feed/yandex.yml",
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
    const [catalogPages, productSlugs, factorySections, portfolio] = await Promise.all([
      catalogService.listCatalogPages(),
      catalogService.listActiveProductSlugs(),
      factoryStorefrontService.listPublicFactorySections(),
      portfolioService.listPublicPortfolio(),
    ]);

    for (const page of normalizeCatalogPages(catalogPages)) {
      if (!page.slug || page.slug === "all" || isPogonazhCatalogPageSlug(page.slug)) continue;
      entries.push({
        url: absoluteUrl(catalogPagePath(page.slug)),
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.9,
      });
    }

    for (const section of factorySections) {
      const config = FACTORY_SECTIONS.find((item) => item.id === section.id);
      for (const factory of section.factories) {
        if (config) {
          entries.push({
            url: absoluteUrl(manufacturerCatalogPath(config.catalogPageSlug, factory.name)),
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.8,
          });
        }
        entries.push({
          url: absoluteUrl(manufacturerCollectionsPath(section.id, factory.name)),
          lastModified: now,
          changeFrequency: "weekly",
          priority: 0.75,
        });
      }
    }

    for (const slug of productSlugs) {
      entries.push({
        url: absoluteUrl(`/product/${encodeURIComponent(slug)}`),
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }

    for (const item of portfolio) {
      entries.push({
        url: absoluteUrl(`/portfolio/${item.id}`),
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  } catch {
    // sitemap still returns static routes if DB is unavailable
  }

  return entries;
}
