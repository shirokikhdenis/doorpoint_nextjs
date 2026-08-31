const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildProductSlug,
  productNeedsGlassInSlug,
} = require("../src/lib/server/domain/productSlug");

test("buildProductSlug joins name, color and glass", () => {
  assert.equal(
    buildProductSlug("Браво-29", { color: "Cappuccino Melinga", glass: "Magic Fog" }),
    "bravo-29-cappuccino-melinga-magic-fog",
  );
});

test("buildProductSlug skips Да/Нет glass tokens", () => {
  assert.equal(
    buildProductSlug("Браво-29", { color: "Cappuccino Melinga", glass: "Нет" }),
    "bravo-29-cappuccino-melinga",
  );
  assert.equal(
    buildProductSlug("Браво-29", { color: "Cappuccino Melinga", glass: "Да" }),
    "bravo-29-cappuccino-melinga",
  );
});

test("buildProductSlug uses glass when color is empty", () => {
  assert.equal(buildProductSlug("Браво-29", { glass: "Magic Fog" }), "bravo-29-magic-fog");
});

test("productNeedsGlassInSlug detects numeric suffix instead of glass", () => {
  assert.equal(
    productNeedsGlassInSlug(
      "Браво-29",
      { color: "Cappuccino Melinga", glass: "Magic Fog" },
      "bravo-29-cappuccino-melinga-2",
    ),
    true,
  );
  assert.equal(
    productNeedsGlassInSlug(
      "Браво-29",
      { color: "Cappuccino Melinga", glass: "Magic Fog" },
      "bravo-29-cappuccino-melinga-magic-fog",
    ),
    false,
  );
  assert.equal(
    productNeedsGlassInSlug(
      "Браво-29",
      { color: "Cappuccino Melinga", glass: "Нет" },
      "bravo-29-cappuccino-melinga",
    ),
    false,
  );
});
