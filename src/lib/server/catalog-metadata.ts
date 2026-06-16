import type { Metadata } from "next";
import { createRequire } from "node:module";
import { flattenSearchParams } from "@/features/catalog/catalog-filter-utils";
import { normalizeCatalogPages } from "@/lib/client/normalizers";
import {
  absoluteUrl,
  buildPageTitle,
  defaultOpenGraph,
} from "@/lib/site-seo";

const require = createRequire(import.meta.url);
const catalogService = require("@/lib/server/services/catalogService") as {
  listCatalogPages: () => Promise<unknown[]>;
};

const CATALOG_DESCRIPTIONS: Record<string, string> = {
  all: "Каталог входных и межкомнатных дверей с фильтрами по параметрам, ценам и акциям.",
  "interior-doors":
    "Межкомнатные двери в Архангельске: коллекции, оттенки и размеры. Замер, доставка и монтаж.",
  "entry-doors":
    "Входные двери в Архангельске: надёжные модели с установкой под ключ. Подбор и бесплатный замер.",
};

const catalogPageCanonicalPath = (catalogPage: string): string => {
  if (!catalogPage || catalogPage === "all") return "/catalog";
  return `/catalog?catalogPage=${encodeURIComponent(catalogPage)}`;
};

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
): Promise<Metadata> {
  const flat = flattenSearchParams(searchParams);
  const catalogPage = flat.catalogPage?.trim() || "all";

  let pageName = "Каталог дверей";
  try {
    const pages = normalizeCatalogPages(await catalogService.listCatalogPages());
    const match = pages.find((item) => item.slug === catalogPage);
    if (match?.name) pageName = match.name;
    else if (catalogPage !== "all") pageName = catalogPage;
  } catch {
    // fallback titles below
  }

  const title =
    catalogPage === "all" ? buildPageTitle("Каталог дверей") : buildPageTitle(pageName);
  const description =
    CATALOG_DESCRIPTIONS[catalogPage] ||
    `${pageName} в Архангельске. Подбор, замер, доставка и монтаж дверей под ключ.`;

  const canonicalPath = catalogPageCanonicalPath(catalogPage);
  const hasNoise = catalogHasSeoNoise(flat);

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(canonicalPath),
    },
    ...(hasNoise
      ? {
          robots: {
            index: false,
            follow: true,
          },
        }
      : {}),
    openGraph: {
      ...defaultOpenGraph(),
      title: catalogPage === "all" ? "Каталог дверей" : pageName,
      description,
      url: absoluteUrl(canonicalPath),
    },
  };
}

export function getCatalogPageHeading(catalogPage: string, pageName: string): string {
  if (catalogPage === "all") return "Каталог дверей";
  return pageName;
}

export { catalogPageCanonicalPath };
