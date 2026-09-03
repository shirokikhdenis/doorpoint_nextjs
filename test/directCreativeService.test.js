const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeDirectCreativeRequest,
  buildZipFilename,
} = require("../src/lib/server/services/directCreativeService");
const { MAX_PRODUCTS, DEFAULT_SCALE } = require("../src/lib/direct-creative-sizes");

test("normalizeDirectCreativeRequest requires products and sizes", () => {
  assert.equal(normalizeDirectCreativeRequest({}).ok, false);
  assert.equal(normalizeDirectCreativeRequest({ productIds: [1] }).ok, false);
  const ok = normalizeDirectCreativeRequest({
    productIds: ["1", 1, 2, -3, "x"],
    sizeIds: ["240x400", "nope", "240x400", "728x90"],
    scale: 3,
    mode: "preview",
  });
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.productIds, [1, 2]);
  assert.deepEqual(ok.sizeIds, ["240x400", "728x90"]);
  assert.equal(ok.scale, 3);
  assert.equal(ok.mode, "preview");
  assert.equal(ok.ctaText, "Смотреть модель");
  assert.equal(ok.showDiscountBadge, true);
});

test("normalizeDirectCreativeRequest caps product count and defaults scale/mode", () => {
  const tooMany = normalizeDirectCreativeRequest({
    productIds: Array.from({ length: MAX_PRODUCTS + 1 }, (_, i) => i + 1),
    sizeIds: ["300x250"],
  });
  assert.equal(tooMany.ok, false);

  const defaults = normalizeDirectCreativeRequest({
    productIds: [7],
    sizeIds: ["300x250"],
  });
  assert.equal(defaults.ok, true);
  assert.equal(defaults.scale, DEFAULT_SCALE);
  assert.equal(defaults.mode, "zip");
});

test("zip filename is date-stamped", () => {
  assert.equal(buildZipFilename(new Date(2026, 8, 2)), "yandex-direct-creatives-2026-09-02.zip");
});

test("normalizeDirectCreativeRequest clips overlay texts", () => {
  const parsed = normalizeDirectCreativeRequest({
    productIds: [5],
    sizeIds: ["300x250"],
    siteName: "  Дверная Точка  ",
    texts: [
      {
        productId: 5,
        name: "  Альфа акция  ",
        priceLabel: "от 9 900 ₽",
        compareLabel: "",
      },
    ],
  });
  assert.equal(parsed.ok, true);
  assert.equal(parsed.siteName, "Дверная Точка");
  assert.deepEqual(parsed.textsByProductId.get(5), {
    name: "Альфа акция",
    priceLabel: "от 9 900 ₽",
    compareLabel: "",
    photoProductIds: [],
  });
});

test("normalizeDirectCreativeRequest clips CTA and keeps discount flag", () => {
  const parsed = normalizeDirectCreativeRequest({
    productIds: [5],
    sizeIds: ["300x250"],
    ctaText: "  Купить сейчас очень длинный текст кнопки  ",
    showDiscountBadge: false,
  });
  assert.equal(parsed.ok, true);
  assert.equal(parsed.ctaText.length <= 24, true);
  assert.equal(parsed.showDiscountBadge, false);
});

test("normalizeDirectCreativeRequest keeps up to 4 collage photo ids", () => {
  const parsed = normalizeDirectCreativeRequest({
    productIds: [5],
    sizeIds: ["300x250"],
    texts: [
      {
        productId: 5,
        name: "Браво-22",
        photoProductIds: [5, 6, 7, 8, 9, 5, "x"],
      },
    ],
  });
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.textsByProductId.get(5).photoProductIds, [5, 6, 7, 8]);
});
