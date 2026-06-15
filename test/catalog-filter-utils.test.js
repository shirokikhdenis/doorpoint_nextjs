const test = require("node:test");
const assert = require("node:assert/strict");
const {
  dedupeProductsById,
  labelMatchesSelections,
  getEffectiveRange,
  buildCatalogQuery,
} = require("../src/features/catalog/catalog-filter-utils.ts");

test("dedupeProductsById keeps first occurrence", () => {
  const items = [
    { id: 1, name: "A", price: 1 },
    { id: 1, name: "B", price: 2 },
    { id: 2, name: "C", price: 3 },
  ];
  const result = dedupeProductsById(items);
  assert.equal(result.length, 2);
  assert.equal(result[0].name, "A");
});

test("labelMatchesSelections requires exact attribute match", () => {
  const label = {
    id: 1,
    title: "Подборка",
    imageUrl: null,
    sortOrder: 0,
    filters: [{ code: "manufacturer", value: "Profildoors" }],
  };
  assert.equal(labelMatchesSelections(label, { manufacturer: ["Profildoors"] }), true);
  assert.equal(labelMatchesSelections(label, { manufacturer: ["Other"] }), false);
  assert.equal(labelMatchesSelections(label, { manufacturer: ["Profildoors", "X"] }), false);
});

test("getEffectiveRange clamps to bounds", () => {
  const result = getEffectiveRange({ min: "10", max: "9999" }, 100, 500);
  assert.equal(result.min, 100);
  assert.equal(result.max, 500);
});

test("buildCatalogQuery serializes filters", () => {
  const qs = buildCatalogQuery("doors", {
    search: "модель",
    sort: "price-asc",
    categories: ["a"],
    subcategories: [],
    attrSelections: { color: ["Белый"] },
    attrRanges: {},
    priceRange: { min: "1000", max: "" },
  });
  assert.ok(qs.includes("catalogPage=doors"));
  assert.ok(qs.includes("search=%D0%BC%D0%BE%D0%B4%D0%B5%D0%BB%D1%8C"));
  assert.ok(qs.includes("attr_color=%D0%91%D0%B5%D0%BB%D1%8B%D0%B9"));
  assert.ok(qs.includes("minPrice=1000"));
});
