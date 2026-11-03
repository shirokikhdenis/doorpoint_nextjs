const test = require("node:test");
const assert = require("node:assert/strict");

const {
  matchAdminCartServiceKey,
} = require("../src/features/store/admin-cart-service-lines.ts");

test("matchAdminCartServiceKey detects montage and delivery", () => {
  assert.equal(matchAdminCartServiceKey("Монтаж (ориентировочно)"), "montage");
  assert.equal(matchAdminCartServiceKey("монтаж дверей"), "montage");
  assert.equal(matchAdminCartServiceKey("Доставка"), "delivery");
  assert.equal(matchAdminCartServiceKey("Доставка по городу"), "delivery");
  assert.equal(matchAdminCartServiceKey("Ручка"), null);
  assert.equal(matchAdminCartServiceKey(""), null);
});
