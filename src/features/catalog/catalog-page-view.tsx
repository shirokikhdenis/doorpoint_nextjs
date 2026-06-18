import { CatalogPageClient } from "@/features/catalog/catalog-page-client";
import { getCatalogPageHeading } from "@/lib/server/catalog-metadata";
import type { CatalogShellInitial } from "@/lib/server/catalog-shell";

type CatalogPageViewProps = {
  initial: CatalogShellInitial;
};

export function CatalogPageView({ initial }: CatalogPageViewProps) {
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
