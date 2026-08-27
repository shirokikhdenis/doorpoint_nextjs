const catalogService = require("./catalogService");
const homeProductSectionService = require("./homeProductSectionService");
const portfolioService = require("./portfolioService");
const homeFactoryLogoService = require("./homeFactoryLogoService");
const testimonialService = require("./testimonialService");
const storefrontSettingsRepository = require("../repositories/storefrontSettingsRepository");

const shuffle = (items) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const pickTopHits = async (catalogPage, count = 8) => {
  const result = await catalogService.getProducts({
    catalogPage,
    limit: count,
    page: 1,
    sort: "popularity",
  });
  return result.items;
};

const pickRandomHits = async (catalogPage, { excludeIds = [], count = 8 } = {}) => {
  const exclude = new Set(excludeIds.map((id) => Number(id)).filter((id) => id > 0));
  const result = await catalogService.getProducts({
    catalogPage,
    limit: 64,
    page: 1,
    sort: "popularity",
  });
  const pool = result.items.filter((item) => !exclude.has(Number(item.id)));
  return shuffle(pool).slice(0, count);
};

const getHomePageData = async () => {
  const settings = await storefrontSettingsRepository.getStorefrontSettings();
  const hitsCount = Math.max(8, settings.homeHitsCardsPerRow * 2);
  const portfolioCount = settings.homePortfolioCardsPerRow;
  const [interiorHits, entryHits, customSections, portfolioItems, factoryLogos, testimonials, catalogPages] =
    await Promise.all([
      pickTopHits("dveri-mezhkomnatnyye", hitsCount),
      pickTopHits("vhodnye-dveri", hitsCount),
      homeProductSectionService.listActiveSectionsWithProducts(),
      portfolioService.listPublicPortfolio(),
      homeFactoryLogoService.listPublicForHomepage(),
      testimonialService.listPublicTestimonials(6),
      catalogService.listCatalogPages(),
    ]);

  const cardImageHeightBySlug = Object.fromEntries(
    (catalogPages || []).map((page) => [page.slug, page.cardImageHeight || "default"]),
  );

  return {
    interiorHits,
    entryHits,
    interiorCoverImage: interiorHits.find((item) => item.image)?.image || "",
    entryCoverImage: entryHits.find((item) => item.image)?.image || "",
    customSections,
    portfolioPreview: portfolioItems.slice(0, portfolioCount),
    factoryLogos,
    testimonials,
    homeHitsCardsPerRow: settings.homeHitsCardsPerRow,
    homePortfolioCardsPerRow: settings.homePortfolioCardsPerRow,
    homePromoCards: settings.homePromoCards,
    cardImageHeightBySlug,
  };
};

module.exports = {
  getHomePageData,
  pickRandomHits,
};
