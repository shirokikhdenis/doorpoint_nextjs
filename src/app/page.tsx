import type { Metadata } from "next";
import { createRequire } from "node:module";
import { HomeCategoryTiles } from "@/features/home/home-category-tiles";
import { HomeProductHits } from "@/features/home/home-product-hits";
import { HomePromotions } from "@/features/home/home-promotions";
import { LocalBusinessJsonLd } from "@/features/store/local-business-json-ld";
import { MeasureLeadForm } from "@/features/store/measure-lead-form";
import { normalizeProductsResponse, normalizePromotionBanners } from "@/lib/client/normalizers";
import { absoluteUrl, buildPageTitle, defaultOpenGraph } from "@/lib/site-seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: buildPageTitle("Главная"),
  description:
    "Входные и межкомнатные двери в Архангельске: акции, хиты продаж, бесплатный замер и монтаж под ключ",
  alternates: {
    canonical: absoluteUrl("/"),
  },
  openGraph: {
    ...defaultOpenGraph(),
    title: buildPageTitle("Главная"),
    description:
      "Входные и межкомнатные двери в Архангельске: акции, хиты продаж, бесплатный замер и монтаж под ключ",
    url: absoluteUrl("/"),
  },
};

export default async function HomePage() {
  const require = createRequire(import.meta.url);
  const homePageService = require("@/lib/server/services/homePageService") as {
    getHomePageData: () => Promise<{
      interiorHits: unknown[];
      entryHits: unknown[];
      interiorCoverImage: string;
      entryCoverImage: string;
    }>;
  };
  const promotionService = require("@/lib/server/services/promotionService") as {
    listActivePromotions: () => Promise<unknown[]>;
  };

  const [data, promotionRows] = await Promise.all([
    homePageService.getHomePageData(),
    promotionService.listActivePromotions(),
  ]);
  const interiorHits = normalizeProductsResponse({ items: data.interiorHits });
  const entryHits = normalizeProductsResponse({ items: data.entryHits });
  const promotionBanners = normalizePromotionBanners(promotionRows);

  return (
    <>
      <LocalBusinessJsonLd />
      <main className="mx-auto w-full max-w-[1536px] space-y-12 px-4 py-6 sm:px-6 lg:space-y-16 lg:px-8 lg:py-8">
        <HomePromotions banners={promotionBanners} />
        <HomeCategoryTiles
          interiorCoverImage={data.interiorCoverImage}
          entryCoverImage={data.entryCoverImage}
        />
        <HomeProductHits
          title="Межкомнатные хиты продаж"
          catalogPage="interior-doors"
          catalogHref="/catalog?catalogPage=interior-doors"
          products={interiorHits}
        />
        <HomeProductHits
          title="Входные хиты продаж"
          catalogPage="entry-doors"
          catalogHref="/catalog?catalogPage=entry-doors"
          products={entryHits}
        />
      </main>
      <MeasureLeadForm />
    </>
  );
}
