const test = require("node:test");
const assert = require("node:assert/strict");
const {
  BOOKLET_FORMATS,
  DEFAULT_HEADLINE,
  MAX_HEADLINE_LEN,
  getFormatById,
  clipHeadline,
  uniquePositiveInts,
  doorKindFromSlug,
  chunkItems,
  buildBookletFilename,
} = require("../src/lib/booklet-formats");
const {
  normalizeBookletRequest,
  resolveBookletPrice,
} = require("../src/lib/server/services/bookletPdfService");

test("getFormatById resolves the three print formats", () => {
  assert.equal(BOOKLET_FORMATS.length, 3);
  assert.equal(getFormatById("a4")?.kind, "flyer");
  assert.equal(getFormatById("a5")?.maxEntry, 2);
  assert.equal(getFormatById("a5-booklet")?.productsPerPage, 4);
  assert.equal(getFormatById("letter"), null);
});

test("normalizeBookletRequest requires format and at least one product", () => {
  assert.equal(normalizeBookletRequest({}).ok, false);
  assert.equal(normalizeBookletRequest({ format: "a4" }).ok, false);
  const ok = normalizeBookletRequest({
    format: "a4",
    entryProductIds: ["1", 1, 2, -3, "x"],
    interiorProductIds: [8],
  });
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.entryProductIds, [1, 2]);
  assert.deepEqual(ok.interiorProductIds, [8]);
  assert.equal(ok.showPrices, true);
  assert.equal(ok.showComparePrices, false);
  assert.equal(ok.showCoupon, true);
  assert.equal(ok.headline, DEFAULT_HEADLINE);
  assert.ok(ok.subhead.length > 0);
});

test("normalizeBookletRequest enforces per-format limits", () => {
  const tooManyA5 = normalizeBookletRequest({
    format: "a5",
    entryProductIds: [1, 2, 3],
    interiorProductIds: [],
  });
  assert.equal(tooManyA5.ok, false);

  const bookletOk = normalizeBookletRequest({
    format: "a5-booklet",
    entryProductIds: Array.from({ length: 8 }, (_, i) => i + 1),
    interiorProductIds: Array.from({ length: 8 }, (_, i) => i + 20),
    showPrices: false,
    showComparePrices: true,
    showCoupon: false,
    headline: "  Двери в Архангельске  ",
    subhead: "  Замер бесплатно  ",
  });
  assert.equal(bookletOk.ok, true);
  assert.equal(bookletOk.showPrices, false);
  assert.equal(bookletOk.showComparePrices, true);
  assert.equal(bookletOk.showCoupon, false);
  assert.equal(bookletOk.headline, "Двери в Архангельске");
  assert.equal(bookletOk.subhead, "Замер бесплатно");
});

test("normalizeBookletRequest clips headline", () => {
  const parsed = normalizeBookletRequest({
    format: "a4",
    interiorProductIds: [4],
    headline: `  ${"очень длинный заголовок буклета ".repeat(10)}  `,
  });
  assert.equal(parsed.ok, true);
  assert.equal(parsed.headline.length <= MAX_HEADLINE_LEN, true);
});

test("buildBookletFilename is date-stamped", () => {
  assert.equal(buildBookletFilename("a4", new Date(2026, 8, 4)), "buklet-a4-2026-09-04.pdf");
  assert.equal(
    buildBookletFilename("a5-booklet", new Date(2026, 8, 4)),
    "buklet-a5-booklet-2026-09-04.pdf",
  );
});

test("doorKindFromSlug only accepts entry and interior doors", () => {
  assert.equal(doorKindFromSlug("entry-doors"), "entry");
  assert.equal(doorKindFromSlug("interior-doors"), "interior");
  assert.equal(doorKindFromSlug("fittings"), null);
  assert.equal(doorKindFromSlug(""), null);
});

test("chunkItems splits booklet inner pages by four", () => {
  assert.deepEqual(
    chunkItems([1, 2, 3, 4, 5], 4),
    [
      [1, 2, 3, 4],
      [5],
    ],
  );
  assert.deepEqual(chunkItems([], 4), []);
});

test("uniquePositiveInts keeps order and drops junk", () => {
  assert.deepEqual(uniquePositiveInts([3, "3", 2, 0, "nope", 2]), [3, 2]);
});

test("clipHeadline trims and caps length", () => {
  assert.equal(clipHeadline("  Привет  "), "Привет");
  assert.equal(clipHeadline("x".repeat(120)).length, MAX_HEADLINE_LEN);
});

test("resolveBookletPrice prefers interior kit price", () => {
  assert.equal(
    resolveBookletPrice({ categorySlug: "interior-doors", price: 10000, kitPrice: 18500 }),
    18500,
  );
  assert.equal(
    resolveBookletPrice({ categorySlug: "interior-doors", price: 10000, kitPrice: null }),
    10000,
  );
  assert.equal(
    resolveBookletPrice({ categorySlug: "entry-doors", price: 42000, kitPrice: 999 }),
    42000,
  );
});

test("resolveComparePrice only for sale with higher compareAt", () => {
  const { resolveComparePrice } = require("../src/lib/server/services/bookletPdfService");
  assert.equal(
    resolveComparePrice({
      categorySlug: "entry-doors",
      price: 20000,
      compareAtPrice: 25000,
      isOnSale: true,
    }),
    25000,
  );
  assert.equal(
    resolveComparePrice({
      categorySlug: "entry-doors",
      price: 20000,
      compareAtPrice: 25000,
      isOnSale: false,
    }),
    null,
  );
});
