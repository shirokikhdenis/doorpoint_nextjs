import { CatalogPageClient } from "@/features/catalog/catalog-page-client";
import { CatalogPaginationLinks } from "@/features/catalog/catalog-pagination-links";
import { StorefrontBreadcrumbs } from "@/features/store/storefront-breadcrumbs";
import { getCatalogPageHeading } from "@/lib/server/catalog-metadata";
import { catalogPagePath } from "@/lib/catalog-page-paths";
import type { CatalogShellInitial } from "@/lib/server/catalog-shell";

type CatalogPageViewProps = {
  initial: CatalogShellInitial;
  manufacturerName?: string;
  manufacturerSlugSegment?: string;
};

export function CatalogPageView({
  initial,
  manufacturerName,
  manufacturerSlugSegment,
}: CatalogPageViewProps) {
  const pageItem = initial.catalogPages.find((item) => item.slug === initial.catalogPage);
  const pageHeading = getCatalogPageHeading(initial.catalogPage, pageItem?.name || "Каталог");
  const heading = manufacturerName ? `${pageHeading} ${manufacturerName}` : pageHeading;

  return (
    <>
      <div className="mx-auto w-full max-w-[1920px] px-4 pt-4 sm:px-6 lg:px-8">
        {manufacturerName ? null : (
          <StorefrontBreadcrumbs
            items={[
              { name: "Главная", href: "/" },
              { name: pageHeading, href: catalogPagePath(initial.catalogPage) },
            ]}
          />
        )}
        <h1 className="mt-3 text-2xl font-semibold text-zinc-900 sm:text-3xl">{heading}</h1>
      </div>
      <CatalogPageClient initial={initial} />
      <div className="mx-auto w-full max-w-[1920px] px-4 pb-8 sm:px-6 lg:px-8">
        <CatalogPaginationLinks
          catalogPage={initial.catalogPage}
          page={initial.page}
          total={initial.total}
          limit={initial.limit}
          extraPath={
            manufacturerSlugSegment ? `/${encodeURIComponent(manufacturerSlugSegment)}` : ""
          }
        />
      </div>
    </>
  );
}
