const test = require("node:test");
const assert = require("node:assert/strict");
const { validateCsvRows, requiredColumns } = require("../src/lib/server/services/csvImportService");

test("required columns contain csv contract fields", () => {
  assert.deepEqual(requiredColumns, ["sku"]);
});

test("validateCsvRows returns errors for missing sku", () => {
  const errors = validateCsvRows([{ name: "Door", price: "10000" }]);

  assert.equal(errors.length, 1);
  assert.match(errors[0], /sku/i);
});
