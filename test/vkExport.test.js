const test = require("node:test");
const assert = require("node:assert/strict");
const {
  resolveAbsoluteUrl,
  buildDescription,
  buildMarketPayload,
  buildPayloadFingerprint,
} = require("../src/lib/server/vk/vkPayloadBuilder");
const { buildScopeKey, buildAlbumTitle, hashPayload } = require("../src/lib/server/repositories/vkSyncRepository");
const { pickExportableProducts } = require("../src/lib/server/services/vkExportService");

test("resolveAbsoluteUrl prepends site origin for relative paths", () => {
  assert.equal(resolveAbsoluteUrl("/uploads/a.jpg", "https://doorpoint29.ru"), "https://doorpoint29.ru/uploads/a.jpg");
  assert.equal(resolveAbsoluteUrl("https://cdn.example/x.png", "https://doorpoint29.ru"), "https://cdn.example/x.png");
  assert.equal(resolveAbsoluteUrl("X", "https://doorpoint29.ru"), "");
});

test("buildScopeKey uses category and subcategory names", () => {
  assert.equal(
    buildScopeKey({ category: "Межкомнатные двери", subcategory: "Экошпон" }),
    "sub:Межкомнатные двери>>>Экошпон",
  );
  assert.equal(buildScopeKey({ category: "Фурнитура", subcategory: "" }), "cat:Фурнитура");
});

test("buildAlbumTitle prefers category/subcategory pair", () => {
  assert.equal(
    buildAlbumTitle({ category: "Межкомнатные двери", subcategory: "Экошпон" }),
    "Межкомнатные двери / Экошпон",
  );
});

test("buildMarketPayload includes sku and product url", () => {
  const { payload } = buildMarketPayload({
    product: {
      id: 1,
      sku: "SKU-1",
      name: "Дверь тест",
      slug: "dver-test",
      price: 15000,
      category: "Межкомнатные двери",
      subcategory: "Экошпон",
      attributes: { manufacturer: "Volhovec" },
      imageUrls: ["/uploads/door.jpg"],
    },
    siteUrl: "https://doorpoint29.ru",
    marketCategoryId: 20009,
    photoId: 42,
  });

  assert.equal(payload.sku, "SKU-1");
  assert.equal(payload.main_photo_id, 42);
  assert.equal(payload.url, "https://doorpoint29.ru/product/dver-test");
  assert.equal(payload.price, "15000");
  assert.match(buildDescription({
    sku: "SKU-1",
    category: "Межкомнатные двери",
    subcategory: "Экошпон",
    attributes: { manufacturer: "Volhovec" },
  }, "https://doorpoint29.ru/product/dver-test"), /Volhovec/);
});

test("hashPayload is stable for same fingerprint", () => {
  const fingerprint = buildPayloadFingerprint({
    product: { sku: "A", name: "B", price: 1, isActive: true },
    imageUrl: "https://example.com/a.jpg",
    productUrl: "https://doorpoint29.ru/product/a",
    description: "desc",
    marketCategoryId: 20009,
    payload: { price: "1", old_price: undefined },
  });
  assert.equal(hashPayload(fingerprint), hashPayload(fingerprint));
});

test("pickExportableProducts skips inactive and imageless products", () => {
  const items = pickExportableProducts(
    [
      { id: 1, isActive: true, imageUrls: ["/uploads/a.jpg"] },
      { id: 2, isActive: false, imageUrls: ["/uploads/b.jpg"] },
      { id: 3, isActive: true, imageUrls: [] },
      { id: 4, isActive: true, imageUrls: ["https://example.com/c.jpg"] },
    ],
    "https://doorpoint29.ru",
  );
  assert.deepEqual(items.map((item) => item.id), [1, 4]);
});
