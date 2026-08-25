import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createRequire } from "node:module";
import {
  CollectionLabelCard,
  type CollectionLabelItem,
} from "@/features/collections/collection-label-card";
import { factoryLabelCardGridClass, storefrontPageContainerClass } from "@/features/store/storefront-ui";
import { absoluteUrl, defaultOpenGraph } from "@/lib/site-seo";
import { cn } from "@/lib/utils";

export const revalidate = 120;

const require = createRequire(import.meta.url);
const collectionService = require("@/lib/server/services/collectionService") as {
  getManufacturerCollectionsPage: (
    sectionId: string,
    manufacturerSlug: string,
  ) => Promise<{
    section: { id: string; title: string; catalogPageSlug: string };
    manufacturer: string;
    manufacturerCatalogHref: string;
    collections: CollectionLabelItem[];
  } | null>;
};

type CollectionsPageProps = {
  params: Promise<{ sectionId: string; manufacturerSlug: string }>;
};

export async function generateMetadata({ params }: CollectionsPageProps): Promise<Metadata> {
  const { sectionId, manufacturerSlug } = await params;
  const page = await collectionService.getManufacturerCollectionsPage(sectionId, manufacturerSlug);
  if (!page) {
    return { title: "Коллекции" };
  }

  const title = `Коллекции ${page.manufacturer} — ${page.section.title}`;
  const description = `Коллекции производителя ${page.manufacturer} (${page.section.title.toLowerCase()}) в каталоге Doorpoint.`;

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/fabriki/${sectionId}/${manufacturerSlug}/kollektsii`),
    },
    openGraph: {
      ...defaultOpenGraph(),
      title,
      description,
      url: absoluteUrl(`/fabriki/${sectionId}/${manufacturerSlug}/kollektsii`),
    },
  };
}

export default async function ManufacturerCollectionsPage({ params }: CollectionsPageProps) {
  const { sectionId, manufacturerSlug } = await params;
  const page = await collectionService.getManufacturerCollectionsPage(sectionId, manufacturerSlug);
  if (!page) notFound();

  return (
    <main className={cn(storefrontPageContainerClass, "py-6")}>
      <nav className="text-sm text-zinc-500" aria-label="Хлебные крошки">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/fabriki" prefetch={false} className="transition hover:text-brand hover:underline">
              Фабрики
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-zinc-700">{page.section.title}</li>
          <li aria-hidden="true">/</li>
          <li className="font-medium text-zinc-900">{page.manufacturer}</li>
        </ol>
      </nav>

      <h1 className="mt-4 text-2xl font-semibold text-zinc-900 sm:text-3xl">
        Коллекции {page.manufacturer}
      </h1>
      <p className="mt-2 text-sm text-zinc-600">{page.section.title}</p>

      {page.collections.length === 0 ? (
        <div className="mt-8 space-y-4">
          <p className="text-sm text-zinc-500">
            Коллекции этого производителя пока не добавлены в каталог.
          </p>
          <Link
            href={page.manufacturerCatalogHref}
            prefetch={false}
            className="inline-flex rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition hover:border-brand/35 hover:text-brand"
          >
            Смотреть все модели {page.manufacturer} →
          </Link>
        </div>
      ) : (
        <section className={cn("mt-6 sm:mt-8", factoryLabelCardGridClass)} aria-label="Коллекции">
          {page.collections.map((collection) => (
            <CollectionLabelCard key={collection.name} item={collection} />
          ))}
        </section>
      )}

      {page.collections.length > 0 ? (
        <p className="mt-8">
          <Link
            href={page.manufacturerCatalogHref}
            prefetch={false}
            className="text-sm font-medium text-brand transition hover:underline"
          >
            Все модели {page.manufacturer} без фильтра по коллекции →
          </Link>
        </p>
      ) : null}
    </main>
  );
}
