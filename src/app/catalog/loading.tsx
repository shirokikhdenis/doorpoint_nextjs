import { CATALOG_CARD_IMAGE_HEIGHT } from "@/features/catalog/catalog-constants";

function CatalogProductSkeleton() {
  return (
    <div className="flex h-full flex-col rounded-lg bg-white p-2 shadow-md">
      <div className={`mb-3 ${CATALOG_CARD_IMAGE_HEIGHT} animate-pulse rounded bg-zinc-100`} />
      <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-100" />
      <div className="mt-2 h-5 w-1/3 animate-pulse rounded bg-zinc-100" />
    </div>
  );
}

export default function CatalogLoading() {
  return (
    <main className="mx-auto w-full max-w-[1920px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <CatalogProductSkeleton key={i} />
        ))}
      </div>
    </main>
  );
}
