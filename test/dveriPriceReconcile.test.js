const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildDveriPriceReconcileReport,
  getCategorySubtreeIds,
} = require("../src/lib/dveri-price-reconcile.js");

const categories = [
  { id: 1, title: "Межкомнатные", parentId: null, path: "Межкомнатные" },
  { id: 2, title: "Экошпон", parentId: 1, path: "Межкомнатные / Экошпон" },
  { id: 3, title: "Входные", parentId: null, path: "Входные" },
];

const pricingRules = {
  defaultRule: { multiplier: 2, roundUpTo: 100, adjustment: 0 },
  categoryRules: {},
};

const product = (overrides) => ({
  id: 10,
  title: "Дверь 1",
  url: "",
  categoryId: 2,
  categoryPath: "Межкомнатные / Экошпон",
  trademarkId: null,
  trademark: "",
  color: "",
  vendorCode: "",
  price: 0,
  priceDealer: 0,
  discount: 0,
  discountDealer: 0,
  priceFinal: 0,
  priceDealerFinal: 5000,
  label: null,
  pictureSmall: null,
  options: [],
  optionCount: 0,
  ...overrides,
});

test("getCategorySubtreeIds includes descendants", () => {
  const ids = getCategorySubtreeIds(1, categories);
  assert.deepEqual([...ids].sort(), [1, 2]);
});

test("buildDveriPriceReconcileReport groups match, lower and higher", () => {
  const report = buildDveriPriceReconcileReport({
    products: [
      product({ id: 1, vendorCode: "A-1", priceDealerFinal: 5000 }),
      product({
        id: 2,
        title: "Дверь 2",
        vendorCode: "",
        options: [
          {
            id: 1,
            title: "200x60",
            vendorCode: "B-1",
            price: 0,
            priceDealer: 0,
            discount: 0,
            discountDealer: 0,
            priceFinal: 0,
            priceDealerFinal: 6000,
            label: null,
          },
          {
            id: 2,
            title: "200x70",
            vendorCode: "B-2",
            price: 0,
            priceDealer: 0,
            discount: 0,
            discountDealer: 0,
            priceFinal: 0,
            priceDealerFinal: 7000,
            label: null,
          },
        ],
        optionCount: 2,
      }),
    ],
    categories,
    pricingRules,
    storefrontPrices: {
      "A-1": 10000,
      "B-1": 11000,
      "B-2": 15000,
    },
    categoryId: 1,
  });

  assert.ok(report);
  assert.equal(report.totalCompared, 3);
  assert.equal(report.matchCount, 1);
  assert.equal(report.storefrontLowerCount, 1);
  assert.equal(report.storefrontHigherCount, 1);
  assert.equal(report.matches[0].vendorCode, "A-1");
  assert.equal(report.storefrontLower[0].vendorCode, "B-1");
  assert.equal(report.storefrontHigher[0].vendorCode, "B-2");
});

test("buildDveriPriceReconcileReport skips rows without storefront price", () => {
  const report = buildDveriPriceReconcileReport({
    products: [product({ vendorCode: "MISSING" })],
    categories,
    pricingRules,
    storefrontPrices: {},
    categoryId: 2,
  });

  assert.equal(report.totalCompared, 0);
  assert.equal(report.skippedNoStorefront, 1);
});
