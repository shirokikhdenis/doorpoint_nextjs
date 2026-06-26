const test = require("node:test");
const assert = require("node:assert/strict");
const {
  DEFAULT_STOREFRONT_SETTINGS,
  normalizeStorefrontSettings,
} = require("../src/lib/server/domain/storefrontSettings");

test("normalizeStorefrontSettings defaults showCatalogKitPrice to true", () => {
  assert.deepEqual(normalizeStorefrontSettings({}), DEFAULT_STOREFRONT_SETTINGS);
  assert.equal(normalizeStorefrontSettings({ showCatalogKitPrice: true }).showCatalogKitPrice, true);
  assert.equal(normalizeStorefrontSettings({ showCatalogKitPrice: false }).showCatalogKitPrice, false);
});

test("normalizeStorefrontSettings defaults showCatalogManufacturerTree to true", () => {
  assert.equal(
    normalizeStorefrontSettings({ showCatalogManufacturerTree: true }).showCatalogManufacturerTree,
    true,
  );
  assert.equal(
    normalizeStorefrontSettings({ showCatalogManufacturerTree: false }).showCatalogManufacturerTree,
    false,
  );
});
