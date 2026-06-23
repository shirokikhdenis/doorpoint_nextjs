const DEFAULT_STOREFRONT_SETTINGS = {
  showCatalogKitPrice: true,
};

const normalizeStorefrontSettings = (payload) => ({
  showCatalogKitPrice:
    payload?.showCatalogKitPrice === undefined
      ? DEFAULT_STOREFRONT_SETTINGS.showCatalogKitPrice
      : payload.showCatalogKitPrice === true,
});

module.exports = {
  DEFAULT_STOREFRONT_SETTINGS,
  normalizeStorefrontSettings,
};
