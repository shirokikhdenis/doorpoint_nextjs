import type { Metadata } from "next";
import { HomeCategoryTiles } from "@/features/home/home-category-tiles";
import { HomeProductHits } from "@/features/home/home-product-hits";
import { HomePromotions } from "@/features/home/home-promotions";
import { LocalBusinessJsonLd } from "@/features/store/local-business-json-ld";
import { MeasureLeadForm } from "@/features/store/measure-lead-form";
import { normalizeProductsResponse, normalizePromotionBanners } from "@/lib/client/normalizers";
import { CATALOG_PAGE_SLUG } from "@/lib/catalog-page-slugs";
import { catalogPagePath } from "@/lib/catalog-url";
import { getCachedActivePromotions, getCachedHomePageData } from "@/lib/server/cache/storefront-cache";
import { SEO_COPY } from "@/lib/seo-copy";
import { absoluteUrl, defaultOpenGraph } from "@/lib/site-seo";

export const revalidate = 120;

export const metadata: Metadata = {
  title: SEO_COPY.home.title,
  description: SEO_COPY.home.description,
  alternates: {
    canonical: absoluteUrl("/"),
  },
  openGraph: {
    ...defaultOpenGraph(),
    title: SEO_COPY.home.title,
    description: SEO_COPY.home.description,
    url: absoluteUrl("/"),
  },
};

export default async function HomePage() {
  const [data, promotionRows] = await Promise.all([
    getCachedHomePageData(),
    getCachedActivePromotions(),
  ]);
  const homeData = data as {
    interiorHits: unknown[];
    entryHits: unknown[];
    interiorCoverImage: string;
    entryCoverImage: string;
  };
  const interiorHits = normalizeProductsResponse({ items: homeData.interiorHits });
  const entryHits = normalizeProductsResponse({ items: homeData.entryHits });
  const promotionBanners = normalizePromotionBanners(promotionRows);

  return (
    <>
      <LocalBusinessJsonLd />
      <main className="mx-auto w-full max-w-[1536px] space-y-12 px-4 py-6 sm:px-6 lg:space-y-16 lg:px-8 lg:py-8">
        <HomePromotions banners={promotionBanners} />
        <HomeCategoryTiles
          interiorCoverImage={homeData.interiorCoverImage}
          entryCoverImage={homeData.entryCoverImage}
        />
        <HomeProductHits
          title="Межкомнатные хиты продаж"
          catalogPage={CATALOG_PAGE_SLUG.interiorDoors}
          catalogHref={catalogPagePath(CATALOG_PAGE_SLUG.interiorDoors)}
          products={interiorHits}
        />
        <HomeProductHits
          title="Входные хиты продаж"
          catalogPage={CATALOG_PAGE_SLUG.entryDoors}
          catalogHref={catalogPagePath(CATALOG_PAGE_SLUG.entryDoors)}
          products={entryHits}
        />
      </main>
      <MeasureLeadForm />
    </>
  );
}
