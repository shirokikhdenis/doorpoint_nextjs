const DEFAULT_HOME_PROMO_CARDS = [
  {
    icon: "price",
    title: "Гарантия лучшей цены",
    description: "Найдете дешевле - сделаем скидку!",
    href: null,
    variant: "default",
  },
  {
    icon: "catalog",
    title: "Двери на любой вкус от ведущих фабрик РФ",
    description: "Перейти в каталог",
    href: "/catalog",
    variant: "default",
  },
  {
    icon: "measure",
    title: "Бесплатный замер",
    description: "Оставить заявку",
    href: "/#zamer-form",
    variant: "offer",
  },
];

const DEFAULT_STOREFRONT_SETTINGS = {
  showCatalogKitPrice: true,
  showCatalogManufacturerTree: true,
  relatedFittingsCardsPerRow: 6,
  collectionDoorsCardsPerRow: 4,
  suggestedHandlesCardsPerRow: 6,
  subcategoryDoorsCardsPerRow: 4,
  homeHitsCardsPerRow: 4,
  homePortfolioCardsPerRow: 4,
  factoryCardsPerRow: 2,
  homePromoCards: DEFAULT_HOME_PROMO_CARDS,
};

const PROMO_ICONS = new Set(["price", "catalog", "measure"]);

const clampCardsPerRow = (value, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(8, Math.max(2, Math.round(n)));
};

const clampFactoryCardsPerRow = (value, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(3, Math.max(2, Math.round(n)));
};

const asBoolean = (value, fallback) => (value === undefined ? fallback : value === true);

const normalizePromoHref = (value) => {
  const href = String(value || "").trim();
  return href || null;
};

const parsePromoCardsInput = (value) => {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }
  return Array.isArray(value) ? value : [];
};

const normalizeHomePromoCard = (payload, fallback) => {
  const row = payload && typeof payload === "object" ? payload : {};
  const icon = PROMO_ICONS.has(row.icon) ? row.icon : fallback.icon;
  return {
    icon,
    title: String(row.title != null ? row.title : fallback.title).trim() || fallback.title,
    description:
      String(row.description != null ? row.description : fallback.description).trim() || fallback.description,
    href: row.href === undefined ? fallback.href : normalizePromoHref(row.href),
    variant: row.variant === "offer" ? "offer" : "default",
  };
};

const normalizeHomePromoCards = (value) => {
  const rows = parsePromoCardsInput(value);
  return DEFAULT_HOME_PROMO_CARDS.map((fallback, index) =>
    normalizeHomePromoCard(rows[index], fallback),
  );
};

const normalizeStorefrontSettings = (payload) => ({
  showCatalogKitPrice: asBoolean(
    payload?.showCatalogKitPrice,
    DEFAULT_STOREFRONT_SETTINGS.showCatalogKitPrice,
  ),
  showCatalogManufacturerTree: asBoolean(
    payload?.showCatalogManufacturerTree,
    DEFAULT_STOREFRONT_SETTINGS.showCatalogManufacturerTree,
  ),
  relatedFittingsCardsPerRow: clampCardsPerRow(
    payload?.relatedFittingsCardsPerRow,
    DEFAULT_STOREFRONT_SETTINGS.relatedFittingsCardsPerRow,
  ),
  collectionDoorsCardsPerRow: clampCardsPerRow(
    payload?.collectionDoorsCardsPerRow,
    DEFAULT_STOREFRONT_SETTINGS.collectionDoorsCardsPerRow,
  ),
  suggestedHandlesCardsPerRow: clampCardsPerRow(
    payload?.suggestedHandlesCardsPerRow,
    DEFAULT_STOREFRONT_SETTINGS.suggestedHandlesCardsPerRow,
  ),
  subcategoryDoorsCardsPerRow: clampCardsPerRow(
    payload?.subcategoryDoorsCardsPerRow,
    DEFAULT_STOREFRONT_SETTINGS.subcategoryDoorsCardsPerRow,
  ),
  homeHitsCardsPerRow: clampCardsPerRow(
    payload?.homeHitsCardsPerRow,
    DEFAULT_STOREFRONT_SETTINGS.homeHitsCardsPerRow,
  ),
  homePortfolioCardsPerRow: clampCardsPerRow(
    payload?.homePortfolioCardsPerRow,
    DEFAULT_STOREFRONT_SETTINGS.homePortfolioCardsPerRow,
  ),
  factoryCardsPerRow: clampFactoryCardsPerRow(
    payload?.factoryCardsPerRow,
    DEFAULT_STOREFRONT_SETTINGS.factoryCardsPerRow,
  ),
  homePromoCards: normalizeHomePromoCards(
    payload?.homePromoCards ?? DEFAULT_STOREFRONT_SETTINGS.homePromoCards,
  ),
});

module.exports = {
  DEFAULT_HOME_PROMO_CARDS,
  DEFAULT_STOREFRONT_SETTINGS,
  normalizeHomePromoCards,
  normalizeStorefrontSettings,
};
