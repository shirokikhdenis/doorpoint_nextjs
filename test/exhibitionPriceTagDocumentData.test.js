const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildInteriorPriceTagPayload,
  buildInteriorPriceTagProductUrl,
  buildPriceTagFilename,
  buildBulkPriceTagFilename,
  sortAccessoriesForTag,
  formatTagPrice,
  formatAccessoryDisplayName,
  KIT_FOOTNOTE_TEXT,
  TAG_WIDTH_MM,
  TAG_HEIGHT_MM,
  A4_WIDTH_MM,
  A4_HEIGHT_MM,
  TAGS_PER_A4_PAGE,
} = require("../src/lib/server/domain/exhibitionPriceTagDocumentData");
const { generateQrCodePng, clearQrCodePngCache } = require("../src/lib/server/domain/qrCodePng");
const { buildProductPageUrl } = require("../src/lib/server/domain/kpPdfCompany");
const {
  renderInteriorPriceTagPdf,
  renderInteriorPriceTagPdfBulk,
} = require("../src/lib/server/services/exhibitionInteriorPriceTagPdfService");

const sampleRow = {
  id: 12,
  categoryType: "interior",
  productId: 100,
  productSlug: "ekza-8m",
  productName: "Экза 8М",
  productSku: "EKZA-8M",
  coatingColor: "Белый софт премиум",
  coatingType: "ПВХ",
  manufacturerName: "ЮККА (Чебоксары)",
  accessories: [
    { id: 3, name: "Добор телескоп 130 мм", sku: "d1", price: 1522, category: "Доборы" },
    { id: 1, name: "Наличник 80 мм", sku: "n1", price: 854, category: "Наличники" },
    { id: 2, name: "Коробка 75 мм", sku: "k1", price: 1232, category: "Коробки" },
  ],
  price: 26775,
  kitPrice: 34189,
  sortOrder: 0,
};

test("formatTagPrice uses ruble formatting", () => {
  assert.match(formatTagPrice(26775), /26\s?775/);
  assert.match(formatTagPrice(26775), /₽/);
  assert.equal(formatTagPrice(null), "—");
});

test("sortAccessoriesForTag orders nalichnik, korobka, dobory", () => {
  const sorted = sortAccessoriesForTag(sampleRow.accessories);
  assert.deepEqual(
    sorted.map((item) => item.name),
    ["Наличник 80 мм", "Коробка 75 мм", "Добор телескоп 130 мм"],
  );
});

test("formatAccessoryDisplayName compacts catalog names for the tag", () => {
  assert.equal(
    formatAccessoryDisplayName("Наличник телескопический / 2180х80х10"),
    "Наличник 80 мм",
  );
  assert.equal(
    formatAccessoryDisplayName("Коробка телескопическая 2070х75х33"),
    "Коробка 75 мм",
  );
  assert.equal(formatAccessoryDisplayName("Добор телескопический 150"), "Добор телескоп 150 мм");
});

test("buildInteriorPriceTagPayload maps exhibition row fields", () => {
  const payload = buildInteriorPriceTagPayload(sampleRow);
  assert.equal(payload.productName, "Экза 8М");
  assert.equal(payload.productId, 100);
  assert.equal(payload.productSlug, "ekza-8m");
  assert.equal(payload.productUrl, buildProductPageUrl("ekza-8m"));
  assert.equal(payload.coatingColor, "Белый софт премиум");
  assert.equal(payload.coatingTypeLine, "Покрытие: ПВХ");
  assert.equal(payload.manufacturerLine, "Фабрика: ЮККА (Чебоксары)");
  assert.equal(payload.priceFormatted, formatTagPrice(26775));
  assert.equal(payload.kitPriceFormatted, formatTagPrice(34189));
  assert.equal(payload.accessories.length, 3);
  assert.equal(payload.footnote, KIT_FOOTNOTE_TEXT);
});

test("buildInteriorPriceTagProductUrl falls back to product id", () => {
  assert.equal(
    buildInteriorPriceTagProductUrl({ productId: 42, productSlug: null }),
    buildProductPageUrl("42"),
  );
  assert.equal(buildInteriorPriceTagProductUrl({ productId: null }), null);
});

test("generateQrCodePng returns a PNG buffer", async () => {
  clearQrCodePngCache();
  const buffer = await generateQrCodePng("https://example.com/product/ekza-8m");
  assert.ok(Buffer.isBuffer(buffer));
  assert.equal(buffer[0], 0x89);
  assert.equal(buffer.subarray(1, 4).toString("ascii"), "PNG");
});

test("buildPriceTagFilename sanitizes product name", () => {
  assert.equal(buildPriceTagFilename(sampleRow), "Cennik-Экза-8М.pdf");
});

test("buildBulkPriceTagFilename includes count and date", () => {
  assert.match(buildBulkPriceTagFilename(3), /^Cenniki-vystavka-3-\d{4}-\d{2}-\d{2}\.pdf$/);
});

test("renderInteriorPriceTagPdf embeds Geometria fonts", async () => {
  const payload = buildInteriorPriceTagPayload(sampleRow);
  const buffer = await renderInteriorPriceTagPdf(payload);
  assert.ok(Buffer.isBuffer(buffer));
  assert.equal(buffer.subarray(0, 4).toString("ascii"), "%PDF");
  const raw = buffer.toString("latin1");
  assert.match(raw, /Geometria/i);
});

test("price tag uses A6 dimensions", () => {
  assert.equal(TAG_WIDTH_MM, 105);
  assert.equal(TAG_HEIGHT_MM, 148);
});

test("bulk price tag PDF fits four A6 tags on one A4 page", async () => {
  const payloads = Array.from({ length: 5 }, () => buildInteriorPriceTagPayload(sampleRow));
  const buffer = await renderInteriorPriceTagPdfBulk(payloads);
  assert.ok(Buffer.isBuffer(buffer));
  assert.equal(buffer.subarray(0, 4).toString("ascii"), "%PDF");
  assert.equal(TAG_WIDTH_MM * TAGS_PER_A4_PAGE / 2, A4_WIDTH_MM);
  assert.equal(TAG_HEIGHT_MM * 2, A4_HEIGHT_MM - 1);
});
