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

test("normalizeStorefrontSettings clamps factory columns to 2–3", () => {
  assert.equal(normalizeStorefrontSettings({ factoryCardsPerRow: 1 }).factoryCardsPerRow, 2);
  assert.equal(normalizeStorefrontSettings({ factoryCardsPerRow: 3 }).factoryCardsPerRow, 3);
  assert.equal(normalizeStorefrontSettings({ factoryCardsPerRow: 8 }).factoryCardsPerRow, 3);
});

test("normalizeStorefrontSettings fills three promo cards", () => {
  const cards = normalizeStorefrontSettings({
    homePromoCards: [{ title: "Своя акция", href: "/sale", variant: "offer" }],
  }).homePromoCards;
  assert.equal(cards.length, 3);
  assert.equal(cards[0].title, "Своя акция");
  assert.equal(cards[0].href, "/sale");
  assert.equal(cards[0].variant, "offer");
  assert.equal(cards[1].href, "/catalog");
});
