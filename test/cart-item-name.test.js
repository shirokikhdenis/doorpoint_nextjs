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

test("formatCartItemName appends finish suffix", () => {
  assert.equal(
    formatCartItemName("Прима-2", "Cream Silk", "Дуб натуральный"),
    "Прима-2 Cream Silk · покрытие: Дуб натуральный",
  );
});

test("formatCartItemName appends glass and hardware suffixes", () => {
  assert.equal(
    formatCartItemName("Прима-2", "", "", "Матовое", [
      { name: "Скрытые петли" },
      { name: "Магнитный замок" },
    ]),
    "Прима-2 · стекло: Матовое · врезка: Скрытые петли, Магнитный замок",
  );
});
