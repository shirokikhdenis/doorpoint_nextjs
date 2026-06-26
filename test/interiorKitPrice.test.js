const test = require("node:test");
const assert = require("node:assert/strict");
const {
  computeInteriorKitPrice,
  isKitPartAttrValue,
  getPogonazhAccessorySortRank,
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

test("getPogonazhAccessorySortRank orders kit parts then dobory then rest", () => {
  assert.equal(getPogonazhAccessorySortRank("коробки", "да"), 0);
  assert.equal(getPogonazhAccessorySortRank("Коробки", "Да"), 0);
  assert.equal(getPogonazhAccessorySortRank("коробки", ""), 3);
  assert.equal(getPogonazhAccessorySortRank("наличники", "yes"), 1);
  assert.equal(getPogonazhAccessorySortRank("наличники", "нет"), 3);
  assert.equal(getPogonazhAccessorySortRank("доборы", ""), 2);
  assert.equal(getPogonazhAccessorySortRank("доборы", "да"), 2);
  assert.equal(getPogonazhAccessorySortRank("фурнитура", "да"), 3);
});
