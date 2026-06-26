const DEFAULT_STOREFRONT_SETTINGS = {
  showCatalogKitPrice: true,
  showCatalogManufacturerTree: true,
};

const normalizeStorefrontSettings = (payload) => ({
  showCatalogKitPrice:
    payload?.showCatalogKitPrice === undefined
      ? DEFAULT_STOREFRONT_SETTINGS.showCatalogKitPrice
      : payload.showCatalogKitPrice === true,
  showCatalogManufacturerTree:
    payload?.showCatalogManufacturerTree === undefined
      ? DEFAULT_STOREFRONT_SETTINGS.showCatalogManufacturerTree
      : payload.showCatalogManufacturerTree === true,
});

module.exports = {
  DEFAULT_STOREFRONT_SETTINGS,
  normalizeStorefrontSettings,
};
