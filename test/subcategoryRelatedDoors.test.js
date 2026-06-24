const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildSubcategoryCatalogHref,
  buildManufacturerSubcategoryCatalogHref,
  buildEntryFactoryCatalogLinks,
  isEntryDoor,
  loadRelatedSubcategoryDoors,
} = require("../src/lib/server/domain/subcategoryRelatedDoors");

const entryDoor = {
  id: 20,
  categorySlug: "entry-doors",
  subcategorySlug: "двери-в-квартиру",
  subcategory: "Двери в квартиру",
};

test("isEntryDoor matches entry-doors category only", () => {
  assert.equal(isEntryDoor(entryDoor), true);
  assert.equal(isEntryDoor({ categorySlug: "interior-doors" }), false);
});

test("buildSubcategoryCatalogHref uses dedicated vitrine when configured", () => {
  assert.equal(buildSubcategoryCatalogHref("двери-в-квартиру"), "/catalog/vhodnye-dveri");
  assert.equal(buildSubcategoryCatalogHref("двери-с-терморазрывом"), "/catalog/termo-dveri");
  assert.match(buildSubcategoryCatalogHref("premium"), /subcategories=premium/);
});

test("loadRelatedSubcategoryDoors returns null without subcategory", async () => {
  const result = await loadRelatedSubcategoryDoors({
    product: { id: 1, categorySlug: "entry-doors" },
    getProducts: async () => ({ items: [] }),
  });
  assert.equal(result, null);
});

test("loadRelatedSubcategoryDoors shuffles siblings and builds href", async () => {
  let capturedQuery = null;
  const result = await loadRelatedSubcategoryDoors({
    product: entryDoor,
    shuffle: (items) => [...items].reverse(),
    getProducts: async (query) => {
      capturedQuery = query;
      return {
        items: [
          { id: 20, name: "Current" },
          { id: 21, name: "Sibling A" },
          { id: 22, name: "Sibling B" },
          { id: 23, name: "Sibling C" },
        ],
      };
    },
    count: 2,
  });

  assert.equal(capturedQuery.catalogPage, "vhodnye-dveri");
  assert.equal(capturedQuery.subcategories, "двери-в-квартиру");
  assert.equal(result.collectionName, "Двери в квартиру");
  assert.equal(result.catalogHref, "/catalog/vhodnye-dveri");
  assert.deepEqual(
    result.items.map((item) => item.id),
    [23, 22],
  );
});

test("buildManufacturerSubcategoryCatalogHref adds manufacturer filter to vitrine", () => {
  assert.equal(
    buildManufacturerSubcategoryCatalogHref("Браво", "двери-в-квартиру"),
    "/catalog/vhodnye-dveri?attr_manufacturer=%D0%91%D1%80%D0%B0%D0%B2%D0%BE",
  );
  assert.equal(
    buildManufacturerSubcategoryCatalogHref("Промет", "двери-с-терморазрывом"),
    "/catalog/termo-dveri?attr_manufacturer=%D0%9F%D1%80%D0%BE%D0%BC%D0%B5%D1%82",
  );
});

test("buildEntryFactoryCatalogLinks returns apartment and thermal catalog links", () => {
  const links = buildEntryFactoryCatalogLinks("Арма");
  assert.equal(links.length, 2);
  assert.equal(links[0].label, "Двери в квартиру");
  assert.equal(links[1].label, "Двери с терморазрывом");
  assert.match(links[0].href, /^\/catalog\/vhodnye-dveri\?attr_manufacturer=/);
  assert.match(links[1].href, /^\/catalog\/termo-dveri\?attr_manufacturer=/);
});
