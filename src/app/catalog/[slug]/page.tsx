import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { createRequire } from "node:module";
import { flattenSearchParams } from "@/features/catalog/catalog-filter-utils";
import { CatalogPageView } from "@/features/catalog/catalog-page-view";
import { resolveCatalogPageSlug } from "@/lib/catalog-page-slugs";
import { buildCatalogPublicHrefFromFlat } from "@/lib/catalog-url";
import { buildCatalogMetadata } from "@/lib/server/catalog-metadata";
import { getCatalogShell } from "@/lib/server/catalog-shell";

export const dynamic = "force-dynamic";

const require = createRequire(import.meta.url);
const catalogService = require("@/lib/server/services/catalogService") as {
  findCatalogPageBySlug: (slug: string) => Promise<{ slug?: string } | null>;
};

type CatalogSlugPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
  searchParams,
}: CatalogSlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  const catalogPage = resolveCatalogPageSlug(slug);
  return buildCatalogMetadata(await searchParams, { catalogPage });
}

export default async function CatalogSlugPage({ params, searchParams }: CatalogSlugPageProps) {
  const { slug } = await params;
  const catalogPage = resolveCatalogPageSlug(slug);
  if (catalogPage === "all") {
    const flat = flattenSearchParams(await searchParams);
    const { catalogPage: _removed, ...rest } = flat;
    permanentRedirect(buildCatalogPublicHrefFromFlat("all", rest));
  }
  const page = await catalogService.findCatalogPageBySlug(catalogPage);
  if (!page?.slug) notFound();

  const resolvedSearchParams = await searchParams;
  const flat = flattenSearchParams(resolvedSearchParams);
  if (flat.catalogPage?.trim()) {
    const { catalogPage: _removed, ...rest } = flat;
    permanentRedirect(buildCatalogPublicHrefFromFlat(catalogPage, rest));
  }

  const initial = await getCatalogShell(resolvedSearchParams, { catalogPage });
  return <CatalogPageView initial={initial} />;
}
