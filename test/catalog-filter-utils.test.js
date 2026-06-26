const test = require("node:test");
const assert = require("node:assert/strict");
const {
  dedupeProductsById,
  labelMatchesSelections,
  getEffectiveRange,
  buildCatalogQuery,
  buildCatalogFilterQuery,
  catalogQueryObjectFromQueryString,
  flattenSearchParams,
  parseCatalogFilterStateFromSearchParams,
  attributeFiltersForSidebar,
  shouldShowCategoryFilters,
  shouldShowSubcategoryFilters,
  buildDefaultCollapsedSections,
  buildFallbackCollapsedSectionIds,
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

test("buildCatalogFilterQuery serializes filters without catalogPage", () => {
  const qs = buildCatalogFilterQuery({
    search: "модель",
    sort: "price-asc",
    categories: ["a"],
    subcategories: [],
    attrSelections: { color: ["Белый"] },
    attrRanges: {},
    priceRange: { min: "1000", max: "" },
    onSale: false,
  });
  assert.ok(!qs.includes("catalogPage="));
  assert.ok(qs.includes("search=%D0%BC%D0%BE%D0%B4%D0%B5%D0%BB%D1%8C"));
  assert.ok(qs.includes("attr_color=%D0%91%D0%B5%D0%BB%D1%8B%D0%B9"));
  assert.ok(qs.includes("minPrice=1000"));
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

test("attributeFiltersForSidebar hides single-value attrs covered by labels", () => {
  const meta = {
    categories: [],
    subcategories: [],
    price: { min: 0, max: 0 },
    labels: [
      {
        id: 1,
        title: "С зеркалом",
        imageUrl: null,
        sortOrder: 0,
        filters: [{ code: "mirror", value: "Да" }],
      },
    ],
    attributeFilters: [
      {
        code: "mirror",
        name: "С зеркалом",
        type: "text",
        values: ["Да"],
      },
      {
        code: "manufacturer",
        name: "Производитель",
        type: "text",
        values: ["ARMA", "Феррони"],
      },
    ],
  };

  const filters = attributeFiltersForSidebar(meta);
  assert.equal(filters.length, 1);
  assert.equal(filters[0].code, "manufacturer");
});

test("attributeFiltersForSidebar hides manufacturer and collection when tree is present", () => {
  const meta = {
    categories: [],
    subcategories: [],
    attributeFilters: [
      { code: "manufacturer", name: "Производитель", type: "text", values: ["A", "B"] },
      { code: "productline", name: "Коллекция", type: "text", values: ["Classic", "Modern"] },
      { code: "color", name: "Цвет", type: "text", values: ["Белый", "Серый"] },
    ],
    price: { min: 0, max: 0 },
    labels: [],
    collectionAttrCode: "productline",
    manufacturerCollectionTree: [{ manufacturer: "A", collections: ["Classic"] }],
  };

  const filters = attributeFiltersForSidebar(meta);
  assert.deepEqual(
    filters.map((filter) => filter.code),
    ["color"],
  );
});

test("category sections hidden when only one option", () => {
  const meta = {
    categories: [{ slug: "entry", name: "Входные двери" }],
    subcategories: [{ slug: "flat", name: "Двери в квартиру", categorySlug: "entry" }],
    attributeFilters: [],
    price: { min: 0, max: 0 },
    labels: [],
  };

  assert.equal(shouldShowCategoryFilters(meta), false);
  assert.equal(shouldShowSubcategoryFilters(meta), false);
});

test("buildDefaultCollapsedSections uses vitrine config when provided", () => {
  const meta = {
    categories: [{ slug: "a", name: "A" }, { slug: "b", name: "B" }],
    subcategories: [{ slug: "s1", name: "S1", categorySlug: "a" }],
    attributeFilters: [{ code: "manufacturer", name: "Производитель", type: "text", values: ["X"] }],
    price: { min: 0, max: 100 },
    labels: [],
    collapsedFilterSections: ["attr-manufacturer"],
  };

  const collapsed = buildDefaultCollapsedSections(meta);
  assert.equal(collapsed.has("attr-manufacturer"), true);
  assert.equal(collapsed.has("categories"), false);
});

test("buildFallbackCollapsedSectionIds includes categories and subcategories", () => {
  const ids = buildFallbackCollapsedSectionIds([
    { code: "thickness", name: "Толщина полотна", type: "number", min: 40, max: 120 },
    { code: "manufacturer", name: "Производитель", type: "text", values: ["A"] },
  ]);
  assert.ok(ids.includes("categories"));
  assert.ok(ids.includes("subcategories"));
  assert.ok(!ids.includes("attr-thickness"));
  assert.ok(ids.includes("attr-manufacturer"));
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
