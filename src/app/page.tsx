import type { Metadata } from "next";
import { HomeArmaFotoTeaser } from "@/features/home/home-arma-foto-teaser";
import { HomeCategoryTiles } from "@/features/home/home-category-tiles";
import type { HomeDoorOfWeekItem } from "@/features/home/home-door-of-week";
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
import {
  getCachedActivePromotions,
  getCachedArmaPhotos,
  getCachedHomePageData,
} from "@/lib/server/cache/storefront-cache";
import { SEO_COPY } from "@/lib/seo-copy";
import { absoluteUrl, defaultOpenGraph } from "@/lib/site-seo";
import { cn } from "@/lib/utils";

const HOME_ARMA_PREVIEW_COUNT = 4;
const HOME_ARMA_INSERT_AFTER_TITLE = "Двери с зеркалом";
const HOME_ARMA_INSERT_BEFORE_TITLE = "Белые двери";

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
  doorOfWeekItems?: HomeDoorOfWeekItem[];
};

function resolveArmaTeaserSplitIndex(sections: Array<{ title: string }>): number {
  const afterMirror = sections.findIndex(
    (section) => section.title === HOME_ARMA_INSERT_AFTER_TITLE,
  );
  if (afterMirror >= 0) return afterMirror + 1;

  const beforeWhite = sections.findIndex(
    (section) => section.title === HOME_ARMA_INSERT_BEFORE_TITLE,
  );
  if (beforeWhite >= 0) return beforeWhite;

  return Math.min(1, sections.length);
}

export default async function HomePage() {
  const [data, promotionRows, armaGallery] = await Promise.all([
    getCachedHomePageData(),
    getCachedActivePromotions(),
    getCachedArmaPhotos(),
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
  const doorOfWeekItems = homeData.doorOfWeekItems ?? [];
  const armaPreview = (armaGallery.items ?? []).slice(0, HOME_ARMA_PREVIEW_COUNT).map((item) => ({
    id: item.id,
    name: item.name,
    previewUrl: item.previewUrl,
  }));
  const armaSplitIndex = resolveArmaTeaserSplitIndex(customSections);
  const customSectionsBeforeArma = customSections.slice(0, armaSplitIndex);
  const customSectionsAfterArma = customSections.slice(armaSplitIndex);

  const renderCustomSection = (
    section: (typeof customSections)[number],
    index: number,
  ) => (
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
  );

  return (
    <>
      <LocalBusinessJsonLd />
      <WebsiteJsonLd />
      <main className={cn(storefrontPageContainerClass, "space-y-12 py-6 lg:space-y-16 lg:py-8")}>
        <HomeHero />
        <HomePromotions banners={promotionBanners} cards={promoCards} doorOfWeekItems={doorOfWeekItems} />
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
        {customSectionsBeforeArma.map((section, index) => renderCustomSection(section, index))}
        <HomeArmaFotoTeaser items={armaPreview} cardsPerRow={hitsCols} />
        {customSectionsAfterArma.map((section, index) =>
          renderCustomSection(section, customSectionsBeforeArma.length + index),
        )}
        <HomePortfolioTeaser items={portfolioPreview} cardsPerRow={portfolioCols} />
        <HomeTestimonials items={testimonials} />
        <MeasureLeadForm embedded />
      </main>
    </>
  );
}
