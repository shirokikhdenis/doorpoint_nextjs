const test = require("node:test");
const assert = require("node:assert/strict");
const { formatCartItemName } = require("../src/lib/cart-item-name");

test("formatCartItemName appends color to product name", () => {
  assert.equal(formatCartItemName("Прима-2 (190х55)", "Cream Silk"), "Прима-2 (190х55) Cream Silk");
});

test("formatCartItemName keeps name when color already included", () => {
  assert.equal(
    formatCartItemName("Прима-2 (190х55) Cream Silk", "Cream Silk"),
    "Прима-2 (190х55) Cream Silk",
  );
});

test("formatCartItemName returns base name without color", () => {
  assert.equal(formatCartItemName("Дверь", ""), "Дверь");
});
