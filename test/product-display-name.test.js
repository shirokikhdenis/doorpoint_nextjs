const test = require("node:test");
const assert = require("node:assert/strict");
const { formatProductDisplayName } = require("../src/lib/product-display-name");

test("formatProductDisplayName joins name, color and glass with spaces", () => {
  assert.equal(
    formatProductDisplayName({
      name: "Браво-50",
      color: "Look Art",
      glass: "Magic Fog",
    }),
    "Браво-50 Look Art Magic Fog",
  );
});

test("formatProductDisplayName skips duplicate tokens", () => {
  assert.equal(
    formatProductDisplayName({
      name: "Браво-50 Look Art",
      color: "Look Art",
      glass: "Magic Fog",
    }),
    "Браво-50 Look Art Magic Fog",
  );
});

test("formatProductDisplayName returns dash for empty name", () => {
  assert.equal(formatProductDisplayName({ name: "" }), "—");
});
