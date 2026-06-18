import type { Metadata } from "next";
import { createRequire } from "node:module";
import { flattenSearchParams } from "@/features/catalog/catalog-filter-utils";
import { buildCatalogSeoCopy } from "@/lib/seo-copy";
import { isPogonazhCatalogPageSlug } from "@/lib/pogonazh-category";
import { resolveCatalogPageSlug } from "@/lib/catalog-page-slugs";
import { catalogPagePath } from "@/lib/catalog-page-paths";
import { absoluteUrl, defaultOpenGraph } from "@/lib/site-seo";

const require = createRequire(import.meta.url);
const catalogService = require("@/lib/server/services/catalogService") as {
  findCatalogPageBySlug: (slug: string) => Promise<{
    name?: string;
    slug?: string;
    seoTitle?: string | null;
    seoDescription?: string | null;
  } | null>;
};

const catalogPageCanonicalPath = (catalogPage: string): string => catalogPagePath(catalogPage);

/** URL with filters, pagination or search should not compete in search index. */
export const catalogHasSeoNoise = (flat: Record<string, string>): boolean => {
  const page = Number(flat.page) || 1;
  if (page > 1) return true;
  if (flat.search?.trim()) return true;
  if (flat.categories?.trim()) return true;
  if (flat.subcategories?.trim()) return true;
  if (flat.minPrice?.trim() || flat.maxPrice?.trim()) return true;
  if (flat.onSale === "1") return true;
  if (flat.catalogLabel?.trim()) return true;

  return Object.keys(flat).some((key) => {
    if (key.startsWith("attr_")) return true;
    return false;
  });
};

export async function buildCatalogMetadata(
  searchParams: Record<string, string | string[] | undefined>,
  options: { catalogPage: string },
): Promise<Metadata> {
  const flat = flattenSearchParams(searchParams);
  const catalogPage = resolveCatalogPageSlug(options.catalogPage);

  let pageName = "Каталог дверей";
  let seoOverrides: { seoTitle?: string | null; seoDescription?: string | null } | undefined;
  try {
    if (catalogPage !== "all") {
      const page = await catalogService.findCatalogPageBySlug(catalogPage);
      if (page?.name) pageName = page.name;
      seoOverrides = {
        seoTitle: page?.seoTitle ?? null,
        seoDescription: page?.seoDescription ?? null,
      };
    }
  } catch {
    // fallback titles below
  }

  const seo = buildCatalogSeoCopy(catalogPage, pageName, seoOverrides);
  const canonicalPath = catalogPageCanonicalPath(catalogPage);
  const hasNoise = catalogHasSeoNoise(flat);
  const isPogonazhPage = isPogonazhCatalogPageSlug(catalogPage);

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: absoluteUrl(canonicalPath),
    },
    ...((hasNoise || isPogonazhPage)
      ? {
          robots: {
            index: false,
            follow: true,
          },
        }
      : {}),
    openGraph: {
      ...defaultOpenGraph(),
      title: seo.title,
      description: seo.description,
      url: absoluteUrl(canonicalPath),
    },
  };
}

export function getCatalogPageHeading(catalogPage: string, pageName: string): string {
  if (catalogPage === "all") return "Каталог дверей";
  return pageName;
}

export { catalogPageCanonicalPath };
