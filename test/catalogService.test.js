const test = require("node:test");
const assert = require("node:assert/strict");
const { buildCatalogFilters } = require("../src/lib/server/services/catalogService");

test("buildCatalogFilters parses filters and pagination", () => {
  const filters = buildCatalogFilters({
    search: "Дверь",
    sort: "price-desc",
    categories: "vhod,tech",
    subcategories: "premium",
    attr_fill: "Пенопласт,Минеральная плита",
    attr_thickness_max: "95",
    page: "3",
    limit: "20"
  });

  assert.equal(filters.search, "Дверь");
  assert.equal(filters.sort, "price-desc");
  assert.deepEqual(filters.categories, ["vhod", "tech"]);
  assert.deepEqual(filters.subcategories, ["premium"]);
  assert.deepEqual(filters.attributeFilters, {
    fill: "Пенопласт,Минеральная плита",
    thickness_max: "95"
  });
  assert.equal(filters.page, 3);
  assert.equal(filters.limit, 20);
  assert.equal(filters.offset, 40);
});
