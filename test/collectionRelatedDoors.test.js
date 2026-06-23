const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  readProductAttrValue,
  isInteriorDoor,
  loadRelatedCollectionDoors,
} = require("../src/lib/server/domain/collectionRelatedDoors");

const interiorDoor = {
  id: 10,
  categorySlug: "interior-doors",
  attributes: [
    { code: "collection", name: "Коллекция", value: "Bravo" },
    { code: "manufacturer", name: "Производитель", value: "VellDor" },
  ],
};

test("isInteriorDoor matches interior-doors category only", () => {
  assert.equal(isInteriorDoor(interiorDoor), true);
  assert.equal(isInteriorDoor({ categorySlug: "entry-doors" }), false);
});

test("readProductAttrValue reads attribute by code", () => {
  assert.equal(readProductAttrValue(interiorDoor, "collection"), "Bravo");
  assert.equal(readProductAttrValue(interiorDoor, "manufacturer"), "VellDor");
  assert.equal(readProductAttrValue(interiorDoor, "missing"), "");
});

test("loadRelatedCollectionDoors returns null without collection", async () => {
  const result = await loadRelatedCollectionDoors({
    product: { id: 1, categorySlug: "interior-doors", attributes: [] },
    getProducts: async () => ({ items: [] }),
  });
  assert.equal(result, null);
});

test("loadRelatedCollectionDoors excludes current product and builds href", async () => {
  let capturedQuery = null;
  const result = await loadRelatedCollectionDoors({
    product: interiorDoor,
    resolveAttrCode: async () => "collection",
    getProducts: async (query) => {
      capturedQuery = query;
      return {
        items: [
          { id: 10, name: "Current" },
          { id: 11, name: "Sibling A" },
          { id: 12, name: "Sibling B" },
        ],
      };
    },
    count: 2,
  });

  assert.equal(capturedQuery.catalogPage, "dveri-mezhkomnatnyye");
  assert.equal(capturedQuery.attr_collection, "Bravo");
  assert.equal(result.collectionName, "Bravo");
  assert.match(result.catalogHref, /attr_collection=Bravo/);
  assert.match(result.catalogHref, /attr_manufacturer=VellDor/);
  assert.deepEqual(
    result.items.map((item) => item.id),
    [11, 12],
  );
});
