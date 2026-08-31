const test = require("node:test");
const assert = require("node:assert/strict");
const { formatDveriProductDisplayTitle } = require("../src/lib/dveri-product-display.js");

test("formatDveriProductDisplayTitle appends color and glass for Bravo", () => {
  assert.equal(
    formatDveriProductDisplayTitle({
      title: "Браво-50",
      color: "Look Art",
      glass: "Magic Fog",
      manufacturer: "Браво",
    }),
    "Браво-50 Look Art Magic Fog",
  );

  assert.equal(
    formatDveriProductDisplayTitle({
      title: "VG2 WW",
      color: "Bianco",
      glass: "Magic Fog",
      manufacturer: "Volhovec",
    }),
    "VG2 WW Bianco",
  );

  assert.equal(
    formatDveriProductDisplayTitle({
      title: "Браво-50",
      color: "",
      glass: "",
      manufacturer: "Браво",
    }),
    "Браво-50",
  );
});
