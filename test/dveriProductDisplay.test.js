const test = require("node:test");
const assert = require("node:assert/strict");
const { formatDveriProductDisplayTitle } = require("../src/lib/dveri-product-display.js");

test("formatDveriProductDisplayTitle appends color and glass", () => {
  assert.equal(
    formatDveriProductDisplayTitle({
      title: "Браво-50",
      color: "Look Art",
      glass: "",
    }),
    "Браво-50 Look Art",
  );

  assert.equal(
    formatDveriProductDisplayTitle({
      title: "VG2 WW",
      color: "Bianco",
      glass: "Magic Fog",
    }),
    "VG2 WW Bianco Magic Fog",
  );

  assert.equal(
    formatDveriProductDisplayTitle({
      title: "Браво-50",
      color: "",
      glass: "",
    }),
    "Браво-50",
  );
});
