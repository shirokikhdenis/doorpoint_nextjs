const test = require("node:test");
const assert = require("node:assert/strict");

const {
  isSameCartLine,
  findCartLine,
} = require("../src/lib/client/cart-line.ts");

test("isSameCartLine distinguishes color and hideCartImage", () => {
  const base = { id: 1, name: "Дверь", color: "Белый", hideCartImage: false };
  assert.equal(isSameCartLine(base, { ...base }), true);
  assert.equal(isSameCartLine(base, { ...base, color: "Чёрный" }), false);
  assert.equal(isSameCartLine(base, { ...base, hideCartImage: true }), false);
});

test("findCartLine locates matching entry", () => {
  const items = [
    { id: 1, name: "A", image: "", price: 1, quantity: 1, color: "Белый" },
    { id: 1, name: "A", image: "", price: 1, quantity: 1, color: "Чёрный" },
  ];
  const found = findCartLine(items, { id: 1, name: "A", color: "Чёрный" });
  assert.equal(found?.color, "Чёрный");
});
