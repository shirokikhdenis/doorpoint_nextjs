const test = require("node:test");
const assert = require("node:assert/strict");
const { resolveProductVariantLabels } = require("../src/lib/product-variant-labels");
const { catalogHasSeoNoise, catalogPageFromQuery } = require("../src/lib/catalog-seo-flags");

test("resolveProductVariantLabels prefers current color chip then attr", () => {
  const labels = resolveProductVariantLabels({
    id: 12,
    attributes: [
      { code: "color", value: "White Silk" },
      { code: "glass", value: "Magic Fog" },
      { code: "manufacturer", value: "Браво" },
    ],
    colorVariants: [
      { id: 11, color: "Look Art" },
      { id: 12, color: "Grey Melinga" },
    ],
  });
  assert.equal(labels.color, "Grey Melinga");
  assert.equal(labels.glass, "Magic Fog");
  assert.equal(labels.manufacturer, "Браво");
});

test("catalogHasSeoNoise ignores page and flags attr filters", () => {
  assert.equal(catalogHasSeoNoise({ page: "3" }), false);
  assert.equal(catalogHasSeoNoise({ attr_manufacturer: "Браво" }), true);
  assert.equal(catalogHasSeoNoise({ search: "арма" }), true);
  assert.equal(catalogPageFromQuery({ page: "4" }), 4);
  assert.equal(catalogPageFromQuery({}), 1);
});
