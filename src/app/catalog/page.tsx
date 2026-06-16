import type { Metadata } from "next";
import { CatalogPageClient } from "@/features/catalog/catalog-page-client";
import {
  buildCatalogMetadata,
  getCatalogPageHeading,
} from "@/lib/server/catalog-metadata";
import { getCatalogShell } from "@/lib/server/catalog-shell";

export const dynamic = "force-dynamic";

type CatalogPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: CatalogPageProps): Promise<Metadata> {
  return buildCatalogMetadata(await searchParams);
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const initial = await getCatalogShell(await searchParams);
  const pageItem = initial.catalogPages.find((item) => item.slug === initial.catalogPage);
  const heading = getCatalogPageHeading(initial.catalogPage, pageItem?.name || "Каталог");

  return (
    <>
      <div className="mx-auto w-full max-w-[1920px] px-4 pt-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">{heading}</h1>
      </div>
      <CatalogPageClient initial={initial} />
    </>
  );
}
