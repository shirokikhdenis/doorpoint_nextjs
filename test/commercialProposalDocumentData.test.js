const test = require("node:test");
const assert = require("node:assert/strict");
const {
  formatKpPrice,
  buildKpDisplayName,
  buildKpFilename,
  buildKpPayload,
  buildKpNumber,
  buildKpAttributes,
} = require("../src/lib/server/domain/commercialProposalDocumentData");
const { detectImageKind } = require("../src/lib/server/domain/resolveImageBuffer");
const { getKpPdfFontPaths } = require("../src/lib/server/domain/kpPdfFonts");
const { renderKpPdf } = require("../src/lib/server/services/commercialProposalPdfService");
const fs = require("node:fs");

test("formatKpPrice uses ruble formatting", () => {
  assert.match(formatKpPrice(4920), /4\s?920/);
  assert.match(formatKpPrice(4920), /₽/);
});

test("buildKpDisplayName appends color and glass for Bravo interior doors", () => {
  const withColor = buildKpDisplayName({
    name: "Браво-0",
    categorySlug: "interior-doors",
    attributes: [
      { code: "manufacturer", value: "Браво" },
      { code: "color", value: "Stormy Silk" },
    ],
  });
  assert.equal(withColor, "Браво-0 Stormy Silk");

  const withGlass = buildKpDisplayName({
    name: "Браво-50",
    categorySlug: "interior-doors",
    attributes: [
      { code: "manufacturer", value: "Браво" },
      { code: "color", value: "Look Art" },
      { code: "glass", value: "Magic Fog" },
    ],
  });
  assert.equal(withGlass, "Браво-50 Look Art Magic Fog");

  const nonBravo = buildKpDisplayName({
    name: "VG2 WW",
    categorySlug: "interior-doors",
    attributes: [
      { code: "manufacturer", value: "Volhovec" },
      { code: "color", value: "Bianco" },
      { code: "glass", value: "Magic Fog" },
    ],
  });
  assert.equal(nonBravo, "VG2 WW Bianco");

  const alreadyIncluded = buildKpDisplayName({
    name: "Браво-0 Stormy Silk",
    categorySlug: "interior-doors",
    attributes: [
      { code: "manufacturer", value: "Браво" },
      { code: "color", value: "Stormy Silk" },
    ],
  });
  assert.equal(alreadyIncluded, "Браво-0 Stormy Silk");
});

test("buildKpFilename prefers sku", () => {
  assert.equal(
    buildKpFilename({
      sku: "5621",
      name: 'Браво / "0"',
      attributes: [{ code: "color", value: "Stormy Silk" }],
    }),
    "KP-5621.pdf",
  );
});

test("buildKpPayload exposes kit price and validity metadata", () => {
  const generatedAt = new Date("2026-06-23T12:00:00");
  const withoutKit = buildKpPayload(
    { id: 6455, name: "Дверь", price: 1000, kitPrice: null, sku: "5621" },
    { generatedAt },
  );
  assert.equal(withoutKit.kitPriceFormatted, null);
  assert.equal(withoutKit.kitAvailable, false);
  assert.equal(withoutKit.kpNumber, buildKpNumber(6455, generatedAt));
  assert.match(withoutKit.validUntilFormatted, /2026/);

  const withKit = buildKpPayload({ name: "Дверь", price: 1000, kitPrice: 2500 });
  assert.equal(withKit.kitPriceFormatted, formatKpPrice(2500));
  assert.equal(withKit.kitAvailable, true);
});

test("buildKpAttributes skips service codes and limits output", () => {
  const attributes = buildKpAttributes({
    attributes: [
      { code: "pogonazh_id", name: "ID", value: "824" },
      { code: "collection", name: "Коллекция", value: "Prima" },
      { code: "glass", name: "Стекло", value: "Матовое" },
      { code: "color", name: "Цвет", value: "Cream Silk" },
    ],
  });
  assert.equal(attributes.some((item) => item.code === "pogonazh_id"), false);
  assert.equal(attributes.length, 3);
});

test("detectImageKind recognizes jpeg and png signatures", () => {
  assert.equal(detectImageKind(Buffer.from([0xff, 0xd8, 0xff, 0x00])), "jpeg");
  assert.equal(
    detectImageKind(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    "png",
  );
  assert.equal(detectImageKind(Buffer.from("hello")), null);
});

test("getKpPdfFontPaths resolves Geometria fonts", () => {
  const fonts = getKpPdfFontPaths();
  assert.ok(fs.existsSync(fonts.regular));
  assert.ok(fs.existsSync(fonts.bold));
  assert.ok(fs.existsSync(fonts.medium));
  assert.match(fonts.regular, /geometria_light\.otf$/i);
});

test("buildKpPayload hides kit block for entry doors", () => {
  const entry = buildKpPayload({
    id: 4229,
    categorySlug: "entry-doors",
    name: "Дверь входная",
    price: 37990,
    kitPrice: null,
  });
  assert.equal(entry.isEntryDoor, true);
  assert.equal(entry.showKitPrice, false);
  assert.equal(entry.showImageFrame, false);
  assert.equal(entry.doorPriceLabel, "Цена");

  const interior = buildKpPayload({
    id: 1,
    categorySlug: "interior-doors",
    name: "Прима-2",
    price: 9684,
    kitPrice: 16029,
  });
  assert.equal(interior.showKitPrice, true);
  assert.equal(interior.showImageFrame, true);
  assert.equal(interior.doorPriceLabel, "Цена за полотно");
});

test("renderKpPdf embeds Geometria fonts", async () => {
  const buffer = await renderKpPdf({
    id: 6455,
    sku: "5621",
    slug: "prima-2-cream",
    name: "Прима-2",
    price: 9684,
    kitPrice: 16029,
    category: "Межкомнатные двери",
    subcategory: "ПЭТ",
    image: "",
    images: [],
    attributes: [
      { code: "color", name: "Цвет", value: "Cream Silk" },
      { code: "collection", name: "Коллекция", value: "Prima" },
    ],
  });
  assert.ok(Buffer.isBuffer(buffer));
  assert.equal(buffer.subarray(0, 4).toString("ascii"), "%PDF");
  const raw = buffer.toString("latin1");
  assert.match(raw, /Geometria/i);
});
