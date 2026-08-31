const test = require("node:test");
const assert = require("node:assert/strict");
const { formatCartItemName } = require("../src/lib/cart-item-name");

test("formatCartItemName appends color to product name", () => {
  assert.equal(formatCartItemName("Прима-2 (190х55)", "Cream Silk"), "Прима-2 (190х55) Cream Silk");
});

test("formatCartItemName appends color and glass for Bravo interior doors", () => {
  assert.equal(
    formatCartItemName(
      "Браво-50",
      "Look Art",
      "",
      "",
      undefined,
      "Magic Fog",
      "Браво",
      "interior-doors",
    ),
    "Браво-50 Look Art Magic Fog",
  );
});

test("formatCartItemName skips glass for non-Bravo interior doors", () => {
  assert.equal(
    formatCartItemName(
      "VG2 WW",
      "Bianco",
      "",
      "",
      undefined,
      "Magic Fog",
      "Volhovec",
      "interior-doors",
    ),
    "VG2 WW Bianco",
  );
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
    "Прима-2 Cream Silk покрытие: Дуб натуральный",
  );
});

test("formatCartItemName appends glass and hardware suffixes", () => {
  assert.equal(
    formatCartItemName("Прима-2", "", "", "Матовое", [
      { name: "Скрытые петли" },
      { name: "Магнитный замок" },
    ]),
    "Прима-2 стекло: Матовое врезка: Скрытые петли, Магнитный замок",
  );
});
