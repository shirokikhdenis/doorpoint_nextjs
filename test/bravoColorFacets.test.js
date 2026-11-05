const test = require("node:test");
const assert = require("node:assert/strict");
const {
  isBravoManufacturerSelected,
} = require("../src/lib/server/repositories/productRepository");

test("isBravoManufacturerSelected recognizes Браво", () => {
  assert.equal(
    isBravoManufacturerSelected({ attributeFilters: { manufacturer: "Браво" } }),
    true,
  );
  assert.equal(
    isBravoManufacturerSelected({ attributeFilters: { manufacturer: "браво" } }),
    true,
  );
  assert.equal(
    isBravoManufacturerSelected({
      attributeFilters: { manufacturer: ["Профиль Дорс", "Браво"] },
    }),
    true,
  );
});

test("isBravoManufacturerSelected rejects other factories", () => {
  assert.equal(
    isBravoManufacturerSelected({ attributeFilters: { manufacturer: "ProfilDoors" } }),
    false,
  );
  assert.equal(isBravoManufacturerSelected({ attributeFilters: {} }), false);
  assert.equal(isBravoManufacturerSelected({}), false);
});
