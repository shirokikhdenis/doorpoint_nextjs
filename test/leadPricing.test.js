const test = require("node:test");
const assert = require("node:assert/strict");
const { computeLeadTotals } = require("../src/lib/server/domain/leadPricing");

test("computeLeadTotals applies percent discount", () => {
  const result = computeLeadTotals(
    [{ price: 10000, quantity: 2 }],
    "percent",
    10,
  );
  assert.equal(result.subtotal, 20000);
  assert.equal(result.discountAmount, 2000);
  assert.equal(result.total, 18000);
});

test("computeLeadTotals applies fixed discount", () => {
  const result = computeLeadTotals(
    [{ price: 5000, quantity: 1 }],
    "amount",
    1500,
  );
  assert.equal(result.total, 3500);
});

test("computeLeadTotals caps fixed discount at subtotal", () => {
  const result = computeLeadTotals([{ price: 1000, quantity: 1 }], "amount", 5000);
  assert.equal(result.total, 0);
});
