import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { flattenSearchParams } from "@/features/catalog/catalog-filter-utils";
import { CatalogPageView } from "@/features/catalog/catalog-page-view";
import { CATALOG_PAGE_SLUG, resolveCatalogPageSlug } from "@/lib/catalog-page-slugs";
import { buildCatalogPublicHrefFromFlat } from "@/lib/catalog-url";
import { buildCatalogMetadata } from "@/lib/server/catalog-metadata";
import { getCatalogShell } from "@/lib/server/catalog-shell";

export const dynamic = "force-dynamic";

type CatalogPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: CatalogPageProps): Promise<Metadata> {
  return buildCatalogMetadata(await searchParams, { catalogPage: CATALOG_PAGE_SLUG.all });
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const resolvedSearchParams = await searchParams;
  const flat = flattenSearchParams(resolvedSearchParams);
  const rawCatalogPage = flat.catalogPage?.trim() || "";
  if (rawCatalogPage) {
    const catalogPage = resolveCatalogPageSlug(rawCatalogPage);
    if (catalogPage !== CATALOG_PAGE_SLUG.all) {
      const { catalogPage: _removed, ...rest } = flat;
      permanentRedirect(buildCatalogPublicHrefFromFlat(catalogPage, rest));
    }
  }

  const initial = await getCatalogShell(resolvedSearchParams, {
    catalogPage: CATALOG_PAGE_SLUG.all,
  });
  return <CatalogPageView initial={initial} />;
}
