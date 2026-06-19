import Image from "next/image";
import Link from "next/link";
import { toPublicImageSrc } from "@/lib/client/image-src";
import { CATALOG_PAGE_SLUG } from "@/lib/catalog-page-slugs";
import { catalogPagePath } from "@/lib/catalog-url";

type HomeCategoryTilesProps = {
  interiorCoverImage?: string;
  entryCoverImage?: string;
};

function CategoryTile({
  title,
  href,
  coverImage,
  fallbackClass,
}: {
  title: string;
  href: string;
  coverImage?: string;
  fallbackClass: string;
}) {
  const imageSrc = toPublicImageSrc(coverImage);

  return (
    <Link
      href={href}
      prefetch={false}
      className={`group relative flex min-h-[220px] flex-col justify-between overflow-hidden rounded-lg border border-zinc-200 bg-white p-6 shadow-md transition hover:border-brand/25 hover:shadow-lg sm:min-h-[260px] ${fallbackClass}`}
    >
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-contain object-right-bottom p-4 transition duration-300 group-hover:scale-[1.02]"
        />
      ) : null}
      <div className="relative z-10 max-w-[55%] space-y-4">
        <h3 className="text-2xl font-bold text-zinc-900 sm:text-3xl">{title}</h3>
        <span className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition group-hover:border-brand group-hover:text-brand">
          Перейти в каталог →
        </span>
      </div>
    </Link>
  );
}

export function HomeCategoryTiles({ interiorCoverImage, entryCoverImage }: HomeCategoryTilesProps) {
  return (
    <section aria-labelledby="home-categories-title" className="space-y-5">
      <h2 id="home-categories-title" className="text-2xl font-bold text-zinc-900 sm:text-3xl">
        Какие двери выбираете?
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        <CategoryTile
          title="Межкомнатные двери"
          href={catalogPagePath(CATALOG_PAGE_SLUG.interiorDoors)}
          coverImage={interiorCoverImage}
          fallbackClass="bg-gradient-to-br from-zinc-50 to-zinc-100"
        />
        <CategoryTile
          title="Входные двери"
          href={catalogPagePath(CATALOG_PAGE_SLUG.entryDoors)}
          coverImage={entryCoverImage}
          fallbackClass="bg-gradient-to-br from-zinc-50 to-zinc-100"
        />
      </div>
    </section>
  );
}
