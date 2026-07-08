const test = require("node:test");
const assert = require("node:assert/strict");
const { sliceCsvDataRowsByRange } = require("../src/lib/client/csv-parse.ts");

const rows = ["a", "b", "c", "d", "e"].map((sku) => ({ sku }));

test("sliceCsvDataRowsByRange returns all rows when inputs are empty", () => {
  const result = sliceCsvDataRowsByRange(rows, "", "");
  assert.deepEqual(
    result.rows.map((row) => row.sku),
    ["a", "b", "c", "d", "e"],
  );
  assert.equal(result.startRow, 1);
  assert.equal(result.endRow, 5);
});

test("sliceCsvDataRowsByRange slices inclusive 1-based range", () => {
  const result = sliceCsvDataRowsByRange(rows, "2", "4");
  assert.deepEqual(
    result.rows.map((row) => row.sku),
    ["b", "c", "d"],
  );
  assert.equal(result.startRow, 2);
  assert.equal(result.endRow, 4);
});

test("sliceCsvDataRowsByRange clamps end to file length", () => {
  const result = sliceCsvDataRowsByRange(rows, "4", "200");
  assert.deepEqual(
    result.rows.map((row) => row.sku),
    ["d", "e"],
  );
  assert.equal(result.endRow, 5);
});

test("sliceCsvDataRowsByRange rejects invalid range", () => {
  const result = sliceCsvDataRowsByRange(rows, "10", "20");
  assert.equal(result.rows.length, 0);
  assert.match(result.error, /больше числа строк/);
});
