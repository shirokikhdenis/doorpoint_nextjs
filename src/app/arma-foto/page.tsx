import type { Metadata } from "next";
import { ArmaFotoInteractive } from "@/features/arma-photos/arma-foto-interactive";
import {
  ArmaFotoHero,
  ArmaFotoHowToOrder,
  ArmaFotoTrustCards,
} from "@/features/arma-photos/arma-foto-selling-sections";
import { StorefrontBreadcrumbs } from "@/features/store/storefront-breadcrumbs";
import { ARMA_CUSTOM_PHOTOS_PATH } from "@/lib/arma-foto-url";
import { getCachedArmaPhotos } from "@/lib/server/cache/storefront-cache";
import { SEO_COPY } from "@/lib/seo-copy";
import { absoluteUrl, defaultOpenGraph } from "@/lib/site-seo";

export const revalidate = 120;

export const metadata: Metadata = {
  title: SEO_COPY.armaFoto.title,
  description: SEO_COPY.armaFoto.description,
  alternates: {
    canonical: absoluteUrl(ARMA_CUSTOM_PHOTOS_PATH),
  },
  openGraph: {
    ...defaultOpenGraph(),
    title: SEO_COPY.armaFoto.title,
    description: SEO_COPY.armaFoto.description,
    url: absoluteUrl(ARMA_CUSTOM_PHOTOS_PATH),
  },
};

export default async function ArmaFotoPage() {
  const gallery = await getCachedArmaPhotos();

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <StorefrontBreadcrumbs
        items={[
          { name: "Главная", href: "/" },
          { name: "Фабрики", href: "/fabriki" },
          { name: "Двери Арма под заказ", href: ARMA_CUSTOM_PHOTOS_PATH },
        ]}
      />
      <ArmaFotoHero />
      <ArmaFotoTrustCards />
      <ArmaFotoHowToOrder />

      <ArmaFotoInteractive items={gallery.items} categories={gallery.categories} />
    </main>
  );
}
