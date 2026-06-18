const test = require("node:test");
const assert = require("node:assert/strict");
const {
  dedupeProductsById,
  labelMatchesSelections,
  getEffectiveRange,
  buildCatalogQuery,
  catalogQueryObjectFromQueryString,
  flattenSearchParams,
  parseCatalogFilterStateFromSearchParams,
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

test("flattenSearchParams keeps first value for duplicate keys", () => {
  assert.deepEqual(
    flattenSearchParams({ catalogPage: ["all", "ignored"], sort: "price-asc" }),
    { catalogPage: "all", sort: "price-asc" },
  );
});

test("parseCatalogFilterStateFromSearchParams reads catalog filters", () => {
  const flat = flattenSearchParams({
    search: "дверь",
    sort: "price-desc",
    categories: "vhod,tech",
    subcategories: "premium",
    attr_fill: "Пенопласт,Минеральная плита",
    attr_thickness_min: "70",
    attr_thickness_max: "95",
    minPrice: "10000",
    maxPrice: "50000",
    onSale: "1",
  });

  const filters = parseCatalogFilterStateFromSearchParams(flat);
  assert.equal(filters.search, "дверь");
  assert.equal(filters.sort, "price-desc");
  assert.deepEqual(filters.categories, ["vhod", "tech"]);
  assert.deepEqual(filters.subcategories, ["premium"]);
  assert.deepEqual(filters.attrSelections.fill, ["Пенопласт", "Минеральная плита"]);
  assert.deepEqual(filters.attrRanges.thickness, { min: "70", max: "95" });
  assert.deepEqual(filters.priceRange, { min: "10000", max: "50000" });
  assert.equal(filters.onSale, true);
});

test("buildCatalogQuery round-trips through catalogQueryObjectFromQueryString", () => {
  const filters = parseCatalogFilterStateFromSearchParams({
    search: "дверь",
    sort: "price-desc",
    categories: "vhod",
    attr_color: "Белый",
    onSale: "1",
  });
  const queryString = buildCatalogQuery("dveri-mezhkomnatnyye", filters);
  assert.equal(
    queryString,
    "catalogPage=dveri-mezhkomnatnyye&search=%D0%B4%D0%B2%D0%B5%D1%80%D1%8C&sort=price-desc&categories=vhod&attr_color=%D0%91%D0%B5%D0%BB%D1%8B%D0%B9&onSale=1",
  );
  assert.deepEqual(catalogQueryObjectFromQueryString(queryString), {
    catalogPage: "dveri-mezhkomnatnyye",
    search: "дверь",
    sort: "price-desc",
    categories: "vhod",
    attr_color: "Белый",
    onSale: "1",
  });
});
