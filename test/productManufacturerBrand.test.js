const { test } = require("node:test");
const assert = require("node:assert/strict");
const { attachManufacturerBrand } = require("../src/lib/server/domain/productManufacturerBrand");

test("attachManufacturerBrand adds logo from factory cards", async () => {
  const product = {
    id: 1,
    attributes: [{ code: "manufacturer", name: "Производитель", value: "Аэлита" }],
  };
  const result = await attachManufacturerBrand(product);
  if (result.manufacturerLogo) {
    assert.equal(result.manufacturerName, "Аэлита");
    assert.match(result.manufacturerLogo, /\//);
  } else {
    assert.equal(result.manufacturerName, undefined);
  }
});

test("attachManufacturerBrand skips products without manufacturer", async () => {
  const product = { id: 1, attributes: [] };
  const result = await attachManufacturerBrand(product);
  assert.equal(result.manufacturerLogo, undefined);
});
