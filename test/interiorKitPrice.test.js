const test = require("node:test");
const assert = require("node:assert/strict");
const {
  computeInteriorKitPrice,
  isKitPartAttrValue,
  getPogonazhAccessorySortRank,
  normalizeKitLeafHeightCm,
  pickKitPartForLeafHeight,
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

test("normalizeKitLeafHeightCm maps to 200 or 230 buckets", () => {
  assert.equal(normalizeKitLeafHeightCm(200), 200);
  assert.equal(normalizeKitLeafHeightCm(190), 200);
  assert.equal(normalizeKitLeafHeightCm(230), 230);
  assert.equal(normalizeKitLeafHeightCm(null), 200);
});

test("pickKitPartForLeafHeight prefers matching length markers over wrong kit flag", () => {
  const rows = [
    {
      id: 1,
      name: 'Коробка "Т" МДФ 2070*70*32 (у,п)',
      subcategorySlug: "коробки",
      isKitPart: true,
      price: 1332,
    },
    {
      id: 2,
      name: 'Коробка "Т" МДФ 2370*70*32 (у,п)',
      subcategorySlug: "коробки",
      isKitPart: false,
      price: 1728,
    },
    {
      id: 3,
      name: 'Наличник "Т" Тип-0 2150*70*8 (20*3)',
      subcategorySlug: "наличники",
      isKitPart: false,
      price: 792,
    },
    {
      id: 4,
      name: 'Наличник "Т" Тип-0 2450*70*8 (20*3)',
      subcategorySlug: "наличники",
      isKitPart: true,
      price: 1044,
    },
  ];

  const korobka200 = pickKitPartForLeafHeight(rows, {
    subcategorySlug: "коробки",
    leafHeightCm: 200,
  });
  const nalichnik200 = pickKitPartForLeafHeight(rows, {
    subcategorySlug: "наличники",
    leafHeightCm: 200,
  });
  const korobka230 = pickKitPartForLeafHeight(rows, {
    subcategorySlug: "коробки",
    leafHeightCm: 230,
  });
  const nalichnik230 = pickKitPartForLeafHeight(rows, {
    subcategorySlug: "наличники",
    leafHeightCm: 230,
  });

  assert.equal(korobka200?.id, 1);
  assert.equal(nalichnik200?.id, 3);
  assert.equal(korobka230?.id, 2);
  assert.equal(nalichnik230?.id, 4);
});
