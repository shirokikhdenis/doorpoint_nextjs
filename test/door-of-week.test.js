const test = require("node:test");
const assert = require("node:assert/strict");
const {
  pickCurrentProductId,
  clampDiscountPercent,
  applyDoorOfWeekDiscount,
  getMoscowWeekIndex,
  normalizeDoorOfWeekSlot,
} = require("../src/lib/server/domain/doorOfWeek");

test("pickCurrentProductId returns null for empty pool", () => {
  assert.equal(pickCurrentProductId([]), null);
});

test("pickCurrentProductId is stable within the same Moscow week", () => {
  const pool = [
    { productId: 11, sortOrder: 0 },
    { productId: 22, sortOrder: 1 },
    { productId: 33, sortOrder: 2 },
  ];
  const monday = new Date("2026-03-02T10:00:00.000Z");
  const wednesday = new Date("2026-03-04T18:00:00.000Z");
  assert.equal(pickCurrentProductId(pool, monday), pickCurrentProductId(pool, wednesday));
});

test("pickCurrentProductId rotates on the next week", () => {
  const pool = [
    { productId: 11, sortOrder: 0 },
    { productId: 22, sortOrder: 1 },
    { productId: 33, sortOrder: 2 },
  ];
  const weekA = new Date("2026-03-02T10:00:00.000Z");
  const weekB = new Date("2026-03-09T10:00:00.000Z");
  const first = pickCurrentProductId(pool, weekA);
  const second = pickCurrentProductId(pool, weekB);
  assert.notEqual(first, second);
  assert.ok([11, 22, 33].includes(first));
  assert.ok([11, 22, 33].includes(second));
});

test("clampDiscountPercent limits values to 1..90", () => {
  assert.equal(clampDiscountPercent(0), 1);
  assert.equal(clampDiscountPercent(10), 10);
  assert.equal(clampDiscountPercent(150), 90);
  assert.equal(clampDiscountPercent(-5), 1);
  assert.equal(clampDiscountPercent("bad"), 10);
});

test("applyDoorOfWeekDiscount computes sale price", () => {
  const result = applyDoorOfWeekDiscount(55990, 10);
  assert.equal(result.compareAtPrice, 55990);
  assert.equal(result.price, 50391);
  assert.equal(result.isOnSale, true);
  assert.equal(result.discountPercent, 10);
});

test("getMoscowWeekIndex increases over time", () => {
  const earlier = getMoscowWeekIndex(new Date("2026-01-05T12:00:00.000Z"));
  const later = getMoscowWeekIndex(new Date("2026-02-02T12:00:00.000Z"));
  assert.ok(later > earlier);
});

test("normalizeDoorOfWeekSlot accepts only slots 1 and 2", () => {
  assert.equal(normalizeDoorOfWeekSlot(1), 1);
  assert.equal(normalizeDoorOfWeekSlot("2"), 2);
  assert.equal(normalizeDoorOfWeekSlot(3), null);
  assert.equal(normalizeDoorOfWeekSlot("bad"), null);
});
