const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeHomeSectionFilters,
  toCatalogProductsQuery,
  buildSectionCatalogHref,
  hasActiveFilters,
} = require("../src/lib/server/domain/homeSectionFilters.js");

test("normalizeHomeSectionFilters trims arrays and attr selections", () => {
  const result = normalizeHomeSectionFilters({
    categories: [" massiv ", "", "interior-doors"],
    subcategories: ["massiv"],
    attrSelections: {
      manufacturer: [" Браво ", "Браво"],
      color: "Белый",
      "": ["x"],
    },
    onSale: true,
    priceRange: { min: "1000", max: "" },
  });

  assert.deepEqual(result.categories, ["massiv", "interior-doors"]);
  assert.deepEqual(result.subcategories, ["massiv"]);
  assert.deepEqual(result.attrSelections, {
    manufacturer: ["Браво", "Браво"],
    color: ["Белый"],
  });
  assert.equal(result.onSale, true);
  assert.equal(result.priceRange.min, "1000");
});

test("normalizeHomeSectionFilters handles empty input", () => {
  const result = normalizeHomeSectionFilters(null);
  assert.deepEqual(result.categories, []);
  assert.deepEqual(result.subcategories, []);
  assert.deepEqual(result.attrSelections, {});
  assert.equal(result.onSale, false);
});

test("toCatalogProductsQuery maps filters to catalog API query", () => {
  const filters = normalizeHomeSectionFilters({
    subcategories: ["massiv"],
    attrSelections: { manufacturer: ["Браво"], color: ["Белый"] },
  });
  const query = toCatalogProductsQuery("dveri-mezhkomnatnyye", filters, { limit: 8, page: 1 });

  assert.equal(query.catalogPage, "dveri-mezhkomnatnyye");
  assert.equal(query.subcategories, "massiv");
  assert.equal(query.attr_manufacturer, "Браво");
  assert.equal(query.attr_color, "Белый");
  assert.equal(query.limit, "8");
  assert.equal(query.page, "1");
  assert.equal(query.sort, "popularity");
});

test("buildSectionCatalogHref includes filter query string", () => {
  const filters = normalizeHomeSectionFilters({
    subcategories: ["massiv"],
    attrSelections: { color: ["Белый"] },
  });
  const href = buildSectionCatalogHref("dveri-mezhkomnatnyye", filters);
  assert.ok(href.startsWith("/catalog/dveri-mezhkomnatnyye?"));
  assert.ok(href.includes("subcategories=massiv"));
  assert.ok(href.includes("attr_color="));
});

test("hasActiveFilters detects configured filters", () => {
  const empty = normalizeHomeSectionFilters({});
  assert.equal(hasActiveFilters(empty), false);

  const withManufacturer = normalizeHomeSectionFilters({
    attrSelections: { manufacturer: ["Браво"] },
  });
  assert.equal(hasActiveFilters(withManufacturer), true);
});
