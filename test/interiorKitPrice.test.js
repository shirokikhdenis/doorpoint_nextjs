const test = require("node:test");
const assert = require("node:assert/strict");
const {
  computeInteriorKitPrice,
  isKitPartAttrValue,
} = require("../src/lib/server/domain/interiorKitPrice");

test("isKitPartAttrValue accepts да in any case", () => {
  assert.equal(isKitPartAttrValue("да"), true);
  assert.equal(isKitPartAttrValue("Да"), true);
  assert.equal(isKitPartAttrValue(" нет "), false);
});

test("computeInteriorKitPrice sums door and trim parts", () => {
  const kitPricing = {
    available: true,
    korobkaQty: 2.5,
    nalichnikQty: 5,
    korobka: { price: 1000 },
    nalichnik: { price: 500 },
  };
  assert.equal(computeInteriorKitPrice(4920, kitPricing), 4920 + 2500 + 2500);
  assert.equal(computeInteriorKitPrice(4920, { available: false }), null);
});
