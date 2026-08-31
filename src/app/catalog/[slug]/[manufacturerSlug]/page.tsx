import type { Metadata } from "next";
import { createRequire } from "node:module";
import { notFound } from "next/navigation";
import { CatalogPageView } from "@/features/catalog/catalog-page-view";
import { StorefrontBreadcrumbs } from "@/features/store/storefront-breadcrumbs";
import { storefrontPageContainerClass } from "@/features/store/storefront-ui";
import { catalogPagePath } from "@/lib/catalog-page-paths";
import { resolveCatalogPageSlug } from "@/lib/catalog-page-slugs";
import { manufacturerSlug } from "@/lib/factory-slug";
import { manufacturerCatalogPath } from "@/lib/manufacturer-catalog-path";
import { buildCatalogMetadata } from "@/lib/server/catalog-metadata";
import { getCatalogShell } from "@/lib/server/catalog-shell";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const require = createRequire(import.meta.url);
const catalogService = require("@/lib/server/services/catalogService") as {
  findCatalogPageBySlug: (slug: string) => Promise<{ name?: string; slug?: string } | null>;
  resolveManufacturerNameForCatalogPage: (
    catalogPage: string,
    manufacturerSlugValue: string,
  ) => Promise<string | null>;
};

type ManufacturerCatalogPageProps = {
  params: Promise<{ slug: string; manufacturerSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
  searchParams,
}: ManufacturerCatalogPageProps): Promise<Metadata> {
  const { slug, manufacturerSlug: manufacturerSlugValue } = await params;
  const catalogPage = resolveCatalogPageSlug(slug);
  const manufacturerName = await catalogService.resolveManufacturerNameForCatalogPage(
    catalogPage,
    manufacturerSlugValue,
  );
  if (!manufacturerName) return { title: "Каталог" };
  const resolved = await searchParams;
  const initial = await getCatalogShell(resolved, { catalogPage, manufacturerName });
  return buildCatalogMetadata(resolved, {
    catalogPage,
    manufacturerName,
    ogImage: initial.products[0]?.image,
  });
}

export default async function ManufacturerCatalogPage({
  params,
  searchParams,
}: ManufacturerCatalogPageProps) {
  const { slug, manufacturerSlug: manufacturerSlugValue } = await params;
  const catalogPage = resolveCatalogPageSlug(slug);
  const catalogPageRow = await catalogService.findCatalogPageBySlug(catalogPage);
  if (!catalogPageRow?.slug) notFound();

  const manufacturerName = await catalogService.resolveManufacturerNameForCatalogPage(
    catalogPage,
    manufacturerSlugValue,
  );
  if (!manufacturerName) notFound();

  const resolvedSearchParams = await searchParams;
  const initial = await getCatalogShell(resolvedSearchParams, { catalogPage, manufacturerName });

  return (
    <>
      <div className={cn(storefrontPageContainerClass, "pt-4")}>
        <StorefrontBreadcrumbs
          items={[
            { name: "Главная", href: "/" },
            { name: catalogPageRow.name || "Каталог", href: catalogPagePath(catalogPage) },
            { name: manufacturerName, href: manufacturerCatalogPath(catalogPage, manufacturerName) },
          ]}
        />
      </div>
      <CatalogPageView
        initial={initial}
        manufacturerName={manufacturerName}
        manufacturerSlugSegment={manufacturerSlug(manufacturerName)}
      />
    </>
  );
}
