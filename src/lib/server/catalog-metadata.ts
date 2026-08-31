import type { Metadata } from "next";
import { createRequire } from "node:module";
import { flattenSearchParams } from "@/features/catalog/catalog-filter-utils";
import { buildCatalogSeoCopy } from "@/lib/seo-copy";
import { isPogonazhCatalogPageSlug } from "@/lib/pogonazh-category";
import { resolveCatalogPageSlug } from "@/lib/catalog-page-slugs";
import { catalogPagePath } from "@/lib/catalog-page-paths";
import { manufacturerSlug } from "@/lib/factory-slug";
import { catalogHasSeoNoise, catalogPageFromQuery } from "@/lib/catalog-seo-flags";
import { toPublicImageSrc } from "@/lib/client/image-src";
import { absoluteUrl, buildPageTitle, defaultOpenGraph } from "@/lib/site-seo";

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

export { catalogHasSeoNoise, catalogPageFromQuery };

const withPageSuffix = (text: string, page: number): string => {
  if (page <= 1) return text;
  return `${text} — страница ${page}`;
};

export async function buildCatalogMetadata(
  searchParams: Record<string, string | string[] | undefined>,
  options: { catalogPage: string; ogImage?: string | null; manufacturerName?: string | null },
): Promise<Metadata> {
  const flat = flattenSearchParams(searchParams);
  const catalogPage = resolveCatalogPageSlug(options.catalogPage);
  const page = catalogPageFromQuery(flat);

  let pageName = "Каталог дверей";
  let seoOverrides: { seoTitle?: string | null; seoDescription?: string | null } | undefined;
  try {
    if (catalogPage !== "all") {
      const found = await catalogService.findCatalogPageBySlug(catalogPage);
      if (found?.name) pageName = found.name;
      seoOverrides = {
        seoTitle: found?.seoTitle ?? null,
        seoDescription: found?.seoDescription ?? null,
      };
    }
  } catch {
    // fallback titles below
  }

  const manufacturerName = String(options.manufacturerName || "").trim();
  const seo = buildCatalogSeoCopy(catalogPage, pageName, seoOverrides);
  const heading = getCatalogPageHeading(catalogPage, pageName);
  const title = manufacturerName
    ? withPageSuffix(buildPageTitle(`${heading} ${manufacturerName}`), page)
    : withPageSuffix(seo.title, page);
  const description = manufacturerName
    ? withPageSuffix(
        `${manufacturerName}: ${seo.description}`,
        page,
      )
    : withPageSuffix(seo.description, page);

  const basePath = catalogPageCanonicalPath(catalogPage);
  const manufacturerPath = manufacturerName
    ? `${basePath}/${encodeURIComponent(manufacturerSlug(manufacturerName))}`
    : basePath;
  const canonicalPath = page > 1 ? `${manufacturerPath}?page=${page}` : manufacturerPath;
  const hasNoise = catalogHasSeoNoise(flat);
  const isPogonazhPage = isPogonazhCatalogPageSlug(catalogPage);
  const ogImage = toPublicImageSrc(options.ogImage);

  return {
    title,
    description,
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
      title,
      description,
      url: absoluteUrl(canonicalPath),
      ...(ogImage ? { images: [{ url: ogImage, alt: title }] } : {}),
    },
  };
}

export function getCatalogPageHeading(catalogPage: string, pageName: string): string {
  if (catalogPage === "all") return "Каталог дверей";
  return pageName;
}

export { catalogPageCanonicalPath };
