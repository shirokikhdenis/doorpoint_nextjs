const test = require("node:test");
const assert = require("node:assert/strict");
const { buildCartCsv } = require("../src/lib/cart-csv-export.js");

test("buildCartCsv uses manufacturer article in the second column", () => {
  const csv = buildCartCsv([
    {
      id: 1,
      name: "Браво-50",
      image: "",
      price: 12000,
      quantity: 2,
      color: "Look Art",
      glass: "Magic Fog",
      manufacturerId: "5621",
    },
  ]);

  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/);
  assert.match(lines[0], /артикул производителя/);
  assert.match(lines[1], /5621/);
  assert.doesNotMatch(lines[1], /;D-/);
});

test("buildCartCsv resolves manufacturer article from lookup map", () => {
  const csv = buildCartCsv(
    [
      {
        id: 42,
        name: "Прима-2",
        image: "",
        price: 9684,
        quantity: 1,
        sku: "PV-190-55",
      },
    ],
    new Map([[42, { manufacturerId: "9012", sku: "PV-190-55" }]]),
  );

  const row = csv.replace(/^\uFEFF/, "").split(/\r?\n/)[1];
  assert.match(row, /9012/);
});
