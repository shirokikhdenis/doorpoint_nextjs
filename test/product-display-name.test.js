const test = require("node:test");
const assert = require("node:assert/strict");
const {
  formatProductDisplayName,
  isBravoInteriorDoor,
} = require("../src/lib/product-display-name");

test("isBravoInteriorDoor matches Bravo interior doors only", () => {
  assert.equal(
    isBravoInteriorDoor({ manufacturer: "Браво", categorySlug: "interior-doors" }),
    true,
  );
  assert.equal(
    isBravoInteriorDoor({ manufacturer: "браво", category: "Межкомнатные двери" }),
    true,
  );
  assert.equal(
    isBravoInteriorDoor({ manufacturer: "Промет", categorySlug: "interior-doors" }),
    false,
  );
  assert.equal(
    isBravoInteriorDoor({ manufacturer: "Браво", categorySlug: "entry-doors" }),
    false,
  );
});

test("formatProductDisplayName joins name, color and glass for Bravo interior doors", () => {
  assert.equal(
    formatProductDisplayName({
      name: "Браво-50",
      color: "Look Art",
      glass: "Magic Fog",
      manufacturer: "Браво",
      categorySlug: "interior-doors",
    }),
    "Браво-50 Look Art Magic Fog",
  );
});

test("formatProductDisplayName skips glass for non-Bravo interior doors", () => {
  assert.equal(
    formatProductDisplayName({
      name: "VG2 WW",
      color: "Bianco",
      glass: "Magic Fog",
      manufacturer: "Volhovec",
      categorySlug: "interior-doors",
    }),
    "VG2 WW Bianco",
  );
});

test("formatProductDisplayName skips duplicate tokens", () => {
  assert.equal(
    formatProductDisplayName({
      name: "Браво-50 Look Art",
      color: "Look Art",
      glass: "Magic Fog",
      manufacturer: "Браво",
      categorySlug: "interior-doors",
    }),
    "Браво-50 Look Art Magic Fog",
  );
});

test("formatProductDisplayName returns dash for empty name", () => {
  assert.equal(formatProductDisplayName({ name: "" }), "—");
});

test("formatProductDisplayName strips trailing stars from the name", () => {
  assert.equal(
    formatProductDisplayName({
      name: "Эмма 250**",
      color: "Белый",
    }),
    "Эмма 250 Белый",
  );
});

test("formatProductDisplayName skips Да/Нет glass tokens", () => {
  assert.equal(
    formatProductDisplayName({
      name: "Мадрид",
      color: "",
      glass: "Нет",
      manufacturer: "Браво",
      categorySlug: "interior-doors",
    }),
    "Мадрид",
  );
  assert.equal(
    formatProductDisplayName({
      name: "Росса 4",
      glass: "Да",
      manufacturer: "Браво",
      categorySlug: "interior-doors",
    }),
    "Росса 4",
  );
});
