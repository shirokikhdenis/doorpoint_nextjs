const test = require("node:test");
const assert = require("node:assert/strict");
const { withBravoSwatchField } = require("../src/lib/bravo-decor-swatch");

test("withBravoSwatchField keeps product photo and adds swatch", () => {
  const result = withBravoSwatchField(
    [{ id: 1, color: "White Silk", image: "/uploads/products/door.jpg" }],
    new Map([["white silk", "/uploads/finishes/bravo/white-silk.jpg"]]),
  );
  assert.equal(result[0].image, "/uploads/products/door.jpg");
  assert.equal(result[0].swatch, "/uploads/finishes/bravo/white-silk.jpg");
});

test("withBravoSwatchField falls back to product image when swatch missing", () => {
  const result = withBravoSwatchField(
    [{ id: 1, color: "Custom", image: "/uploads/products/door.jpg" }],
    new Map(),
  );
  assert.equal(result[0].swatch, "/uploads/products/door.jpg");
});
