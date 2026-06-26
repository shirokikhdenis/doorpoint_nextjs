const test = require("node:test");
const assert = require("node:assert/strict");
const {
  isSingleVariantWithoutAxes,
  resolveProductDisplayPrice,
} = require("../src/features/product/product-display-price.js");

const product = { price: 5000, isOnSale: false, compareAtPrice: null };

const loneVariantNoAxes = [
  {
    sku: "HANDLE-1",
    price: 3000,
    attributes: [{ code: "manufacturer", name: "Производитель", value: "FOGO", isVariantAxis: false }],
  },
];

const loneVariantWithAxis = [
  {
    sku: "DOOR-1--abc",
    price: 3000,
    attributes: [{ code: "size", name: "Размер", value: "800x2000", isVariantAxis: true }],
  },
];

const twoVariants = [
  loneVariantWithAxis[0],
  {
    sku: "DOOR-1--def",
    price: 3200,
    attributes: [{ code: "size", name: "Размер", value: "900x2000", isVariantAxis: true }],
  },
];

test("isSingleVariantWithoutAxes is true for one variant without axes", () => {
  assert.equal(isSingleVariantWithoutAxes(loneVariantNoAxes), true);
  assert.equal(isSingleVariantWithoutAxes(loneVariantWithAxis), false);
  assert.equal(isSingleVariantWithoutAxes(twoVariants), false);
  assert.equal(isSingleVariantWithoutAxes([]), false);
});

test("resolveProductDisplayPrice uses product.price for single variant without axes", () => {
  assert.equal(resolveProductDisplayPrice(product, 3000, loneVariantNoAxes), 5000);
});

test("resolveProductDisplayPrice uses variant price when axes exist", () => {
  assert.equal(resolveProductDisplayPrice(product, 3000, loneVariantWithAxis), 3000);
  assert.equal(resolveProductDisplayPrice(product, 3200, twoVariants), 3200);
});
