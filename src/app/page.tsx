import type { Metadata } from "next";
import { HomeCategoryTiles } from "@/features/home/home-category-tiles";
import { HomeFactoryLogos } from "@/features/home/home-factory-logos";
import { HomeHero } from "@/features/home/home-hero";
import { HomePortfolioTeaser } from "@/features/home/home-portfolio-teaser";
import { HomeProductHits } from "@/features/home/home-product-hits";
import { HomePromotions, type HomePromoCard } from "@/features/home/home-promotions";
import { HomeTestimonials } from "@/features/home/home-testimonials";
import { LocalBusinessJsonLd } from "@/features/store/local-business-json-ld";
import { WebsiteJsonLd } from "@/features/store/website-json-ld";
import { MeasureLeadForm } from "@/features/store/measure-lead-form";
import { storefrontPageContainerClass } from "@/features/store/storefront-ui";
import {
  normalizeHomeProductSections,
  normalizePromotionBanners,
  normalizeProductsResponse,
} from "@/lib/client/normalizers";
import { CATALOG_PAGE_SLUG } from "@/lib/catalog-page-slugs";
import { catalogPagePath } from "@/lib/catalog-url";
import { getCachedActivePromotions, getCachedHomePageData } from "@/lib/server/cache/storefront-cache";
import { SEO_COPY } from "@/lib/seo-copy";
import { absoluteUrl, defaultOpenGraph } from "@/lib/site-seo";
import { cn } from "@/lib/utils";

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

type HomePageData = {
  interiorHits: unknown[];
  entryHits: unknown[];
  interiorCoverImage: string;
  entryCoverImage: string;
  customSections?: unknown[];
  portfolioPreview?: Array<{ id: number; title: string; coverImage: string }>;
  factoryLogos?: Array<{ name: string; logoImage: string | null; href: string }>;
  testimonials?: Array<{
    id: number;
    authorName: string;
    body: string;
    rating: number | null;
  }>;
  homeHitsCardsPerRow?: number;
  homePortfolioCardsPerRow?: number;
  homePromoCards?: Array<{
    icon: "price" | "catalog" | "measure";
    title: string;
    description: string;
    href: string | null;
    variant: "default" | "offer";
  }>;
  cardImageHeightBySlug?: Record<string, "default" | "compact">;
};

export default async function HomePage() {
  const [data, promotionRows] = await Promise.all([
    getCachedHomePageData(),
    getCachedActivePromotions(),
  ]);
  const homeData = data as HomePageData;
  const interiorHits = normalizeProductsResponse({ items: homeData.interiorHits });
  const entryHits = normalizeProductsResponse({ items: homeData.entryHits });
  const customSections = normalizeHomeProductSections(homeData.customSections);
  const promotionBanners = normalizePromotionBanners(promotionRows);
  const portfolioPreview = homeData.portfolioPreview ?? [];
  const factoryLogos = homeData.factoryLogos ?? [];
  const testimonials = (homeData.testimonials ?? []).map((item) => ({
    id: item.id,
    authorName: item.authorName,
    body: item.body,
    rating: item.rating,
  }));
  const hitsCols = homeData.homeHitsCardsPerRow ?? 4;
  const portfolioCols = homeData.homePortfolioCardsPerRow ?? 4;
  const promoCards = homeData.homePromoCards as HomePromoCard[] | undefined;
  const imageHeightBySlug = homeData.cardImageHeightBySlug ?? {};

  return (
    <>
      <LocalBusinessJsonLd />
      <WebsiteJsonLd />
      <main className={cn(storefrontPageContainerClass, "space-y-12 py-6 lg:space-y-16 lg:py-8")}>
        <HomeHero />
        <HomePromotions banners={promotionBanners} cards={promoCards} />
        <HomeCategoryTiles
          interiorCoverImage={homeData.interiorCoverImage}
          entryCoverImage={homeData.entryCoverImage}
        />
        <HomeFactoryLogos items={factoryLogos} />
        <HomeProductHits
          title="Межкомнатные хиты продаж"
          catalogPage={CATALOG_PAGE_SLUG.interiorDoors}
          catalogHref={catalogPagePath(CATALOG_PAGE_SLUG.interiorDoors)}
          products={interiorHits}
          cardsPerRow={hitsCols}
          cardImageHeight={imageHeightBySlug[CATALOG_PAGE_SLUG.interiorDoors]}
        />
        <HomeProductHits
          title="Входные хиты продаж"
          catalogPage={CATALOG_PAGE_SLUG.entryDoors}
          catalogHref={catalogPagePath(CATALOG_PAGE_SLUG.entryDoors)}
          products={entryHits}
          variant="muted"
          cardsPerRow={hitsCols}
          cardImageHeight={imageHeightBySlug[CATALOG_PAGE_SLUG.entryDoors]}
        />
        {customSections.map((section, index) => (
          <HomeProductHits
            key={section.id}
            title={section.title}
            catalogPage={section.catalogPageSlug}
            catalogHref={section.catalogHref}
            products={section.products}
            sectionId={section.id}
            loadMoreCount={section.productLimit}
            variant={index % 2 === 0 ? "default" : "muted"}
            cardsPerRow={hitsCols}
            cardImageHeight={imageHeightBySlug[section.catalogPageSlug]}
          />
        ))}
        <HomePortfolioTeaser items={portfolioPreview} cardsPerRow={portfolioCols} />
        <HomeTestimonials items={testimonials} />
        <MeasureLeadForm embedded />
      </main>
    </>
  );
}
