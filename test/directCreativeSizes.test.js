const test = require("node:test");
const assert = require("node:assert/strict");
const {
  DIRECT_CREATIVE_SIZES,
  DEFAULT_SIZE_IDS,
  ALLOWED_SCALES,
  DEFAULT_SCALE,
  DESIGN_SCALE,
  MAX_JPEG_BYTES,
  DEFAULT_CTA_TEXT,
  layoutFamilyForBlock,
  getSizeById,
  resolveScale,
  resolveOutputPixels,
  resolveDesignPixels,
  isCompactBlock,
  formatCreativeBrandLine,
  sanitizeCreativeFileStem,
  buildCreativeFilename,
  formatPriceFrom,
  clipCreativeText,
} = require("../src/lib/direct-creative-sizes");

test("catalog covers all Direct graphic block sizes", () => {
  const ids = DIRECT_CREATIVE_SIZES.map((size) => size.id);
  assert.deepEqual(ids, [
    "240x400",
    "300x250",
    "300x500",
    "300x600",
    "320x50",
    "320x100",
    "320x480",
    "336x280",
    "480x320",
    "600x600",
    "728x90",
    "970x250",
    "1600x900",
  ]);
  assert.equal(MAX_JPEG_BYTES, 512 * 1024);
  assert.deepEqual(DEFAULT_SIZE_IDS, ["240x400", "300x250", "728x90"]);
});

test("layout family matches Direct banner shapes", () => {
  assert.equal(layoutFamilyForBlock(240, 400), "portrait");
  assert.equal(layoutFamilyForBlock(300, 500), "portrait");
  assert.equal(layoutFamilyForBlock(300, 600), "portrait");
  assert.equal(layoutFamilyForBlock(320, 480), "portrait");
  assert.equal(layoutFamilyForBlock(300, 250), "card");
  assert.equal(layoutFamilyForBlock(336, 280), "card");
  assert.equal(layoutFamilyForBlock(480, 320), "card");
  assert.equal(layoutFamilyForBlock(600, 600), "card");
  assert.equal(layoutFamilyForBlock(1600, 900), "landscape");
  assert.equal(layoutFamilyForBlock(320, 50), "wide");
  assert.equal(layoutFamilyForBlock(320, 100), "wide");
  assert.equal(layoutFamilyForBlock(728, 90), "wide");
  assert.equal(layoutFamilyForBlock(970, 250), "wide");
});

test("each catalog size has a matching family", () => {
  for (const size of DIRECT_CREATIVE_SIZES) {
    assert.equal(size.family, layoutFamilyForBlock(size.blockWidth, size.blockHeight));
  }
});

test("scale 1/2/3 maps to output pixels", () => {
  const size = getSizeById("300x250");
  assert.equal(resolveScale(DEFAULT_SCALE), 2);
  assert.deepEqual(ALLOWED_SCALES, [1, 2, 3]);
  assert.deepEqual(resolveOutputPixels(size, 1), { width: 300, height: 250 });
  assert.deepEqual(resolveOutputPixels(size, 2), { width: 600, height: 500 });
  assert.deepEqual(resolveOutputPixels(size, 3), { width: 900, height: 750 });
  assert.equal(resolveScale(4), null);
  assert.equal(resolveOutputPixels(size, 4), null);
  assert.equal(getSizeById("nope"), null);
});

test("filename stem strips unsafe characters", () => {
  assert.equal(sanitizeCreativeFileStem("ABC-001"), "ABC-001");
  assert.equal(sanitizeCreativeFileStem("Альфа 01", 12), "01");
  assert.equal(sanitizeCreativeFileStem("Альфа", 12), "id12");
  assert.equal(sanitizeCreativeFileStem("", 9), "id9");
  assert.equal(sanitizeCreativeFileStem(""), "door");
  assert.equal(
    buildCreativeFilename({ sku: "ABC-001", width: 600, height: 500 }),
    "ABC-001_600x500.jpg",
  );
});

test("price line uses from-prefix", () => {
  assert.equal(formatPriceFrom(18900), "от 18 900 ₽");
});

test("clipCreativeText trims and limits length", () => {
  assert.equal(clipCreativeText("  Альфа   белый  ", 80), "Альфа белый");
  assert.equal(clipCreativeText("1234567890", 4), "1234");
});

test("design pixels are always block × 3 and independent of output scale", () => {
  const size = getSizeById("240x400");
  assert.equal(DESIGN_SCALE, 3);
  assert.deepEqual(resolveDesignPixels(size), { width: 720, height: 1200 });
  assert.deepEqual(resolveOutputPixels(size, 1), { width: 240, height: 400 });
  assert.equal(DEFAULT_CTA_TEXT, "Смотреть модель");
});

test("square stays card and 16:9 uses landscape with a capped design canvas", () => {
  const square = getSizeById("600x600");
  const wideHd = getSizeById("1600x900");
  assert.equal(square.family, "card");
  assert.equal(square.note, "квадрат");
  assert.deepEqual(resolveDesignPixels(square), { width: 1800, height: 1800 });
  assert.deepEqual(resolveOutputPixels(square, 1), { width: 600, height: 600 });
  assert.equal(wideHd.family, "landscape");
  assert.equal(wideHd.note, "16:9");
  assert.deepEqual(resolveDesignPixels(wideHd), { width: 2400, height: 1350 });
  assert.deepEqual(resolveOutputPixels(wideHd, 1), { width: 1600, height: 900 });
});

test("compact blocks are the short wide banners", () => {
  assert.equal(isCompactBlock(50), true);
  assert.equal(isCompactBlock(90), true);
  assert.equal(isCompactBlock(100), true);
  assert.equal(isCompactBlock(250), false);
  assert.equal(isCompactBlock(400), false);
});

test("formatCreativeBrandLine keeps public hosts and drops localhost", () => {
  assert.equal(formatCreativeBrandLine("https://www.dvernayatochka.ru/"), "dvernayatochka.ru");
  assert.equal(formatCreativeBrandLine("http://localhost:3000"), "");
  assert.equal(formatCreativeBrandLine("127.0.0.1"), "");
});
