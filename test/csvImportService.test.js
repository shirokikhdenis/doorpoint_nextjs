const test = require("node:test");
const assert = require("node:assert/strict");
const {
  validateCsvRows,
  requiredColumns,
  IMPORT_MODES,
  resolveUpdateOnlyRowDecision,
  resolveImportVariantPricing,
  parseVariantSizeList,
  buildVariantAttributeSetsFromRow,
  extractImageUrls,
} = require("../src/lib/server/services/csvImportService");

const sizeAttr = { id: 10, code: "size", name: "Размер", type: "option", options: [] };
const openingAttr = { id: 11, code: "opening", name: "Открывание", type: "option", options: [] };
const attributeByCode = new Map([
  ["size", sizeAttr],
  ["opening", openingAttr],
]);
const attributeByName = new Map([["размер", sizeAttr], ["открывание", openingAttr]]);
const attributeOptionLookup = new Map();

test("required columns contain csv contract fields", () => {
  assert.deepEqual(requiredColumns, ["sku"]);
});

test("validateCsvRows returns errors for missing sku", () => {
  const errors = validateCsvRows([{ name: "Door", price: "10000" }]);

  assert.equal(errors.length, 1);
  assert.match(errors[0], /sku/i);
});

test("extractImageUrls keeps two local originals separated by space", () => {
  assert.deepEqual(extractImageUrls("/uploads/products/a.jpg /uploads/products/a_1.jpg"), [
    "/uploads/products/a.jpg",
    "/uploads/products/a_1.jpg",
  ]);
});

test("extractImageUrls keeps multiple http image urls", () => {
  assert.deepEqual(
    extractImageUrls("https://cdn.example/a.jpg https://cdn.example/a_1.jpg"),
    ["https://cdn.example/a.jpg", "https://cdn.example/a_1.jpg"],
  );
});

test("resolveUpdateOnlyRowDecision skips unknown product sku", () => {
  const decision = resolveUpdateOnlyRowDecision({
    sku: "NEW-001",
    productSkuSet: new Set(["EXISTING-001"]),
    applyVariantPatch: false,
    resolvedVariantSku: "",
    variantSkuSet: new Set(),
    rowIndex: 4,
  });

  assert.equal(decision.action, "skip");
  assert.match(decision.warning, /NEW-001/);
  assert.match(decision.warning, /Row 5/);
});

test("resolveUpdateOnlyRowDecision drops variant patch for unknown variant sku", () => {
  const decision = resolveUpdateOnlyRowDecision({
    sku: "HANDLE-01",
    productSkuSet: new Set(["HANDLE-01"]),
    applyVariantPatch: true,
    resolvedVariantSku: "HANDLE-01--abc123",
    variantSkuSet: new Set(["HANDLE-01"]),
    rowIndex: 7,
  });

  assert.equal(decision.action, "update");
  assert.equal(decision.applyVariantPatch, false);
  assert.match(decision.warning, /вариант/);
  assert.match(decision.warning, /HANDLE-01--abc123/);
});

test("resolveUpdateOnlyRowDecision keeps variant patch when variant exists", () => {
  const decision = resolveUpdateOnlyRowDecision({
    sku: "HANDLE-01",
    productSkuSet: new Set(["HANDLE-01"]),
    applyVariantPatch: true,
    resolvedVariantSku: "HANDLE-01--abc123",
    variantSkuSet: new Set(["HANDLE-01", "HANDLE-01--abc123"]),
    rowIndex: 0,
  });

  assert.equal(decision.action, "update");
  assert.equal(decision.applyVariantPatch, true);
  assert.equal(decision.warning, null);
});

test("resolveImportVariantPricing mirrors product price to variant when variantPrice omitted", () => {
  const result = resolveImportVariantPricing({
    present: {
      price: true,
      variantPrice: false,
      variantSku: false,
      variantImageUrl: false,
      variantAttributes: false,
    },
    productPrice: 12500,
    variantPrice: undefined,
    finalVariantAttributesLength: 1,
  });

  assert.equal(result.variantPricePayload, 12500);
  assert.equal(result.applyVariantPatch, true);
  assert.equal(result.presentVariantPrice, true);
  assert.equal(result.syncAllVariantPrices, false);
});

test("resolveImportVariantPricing syncs all variants for price-only row", () => {
  const result = resolveImportVariantPricing({
    present: {
      price: true,
      variantPrice: false,
      variantSku: false,
      variantImageUrl: false,
      variantAttributes: false,
    },
    productPrice: 9900,
    variantPrice: undefined,
    finalVariantAttributesLength: 0,
  });

  assert.equal(result.variantPricePayload, 9900);
  assert.equal(result.applyVariantPatch, false);
  assert.equal(result.syncAllVariantPrices, true);
});

test("resolveImportVariantPricing keeps explicit variantPrice", () => {
  const result = resolveImportVariantPricing({
    present: {
      price: true,
      variantPrice: true,
      variantSku: false,
      variantImageUrl: false,
      variantAttributes: false,
    },
    productPrice: 10000,
    variantPrice: 9500,
    finalVariantAttributesLength: 0,
  });

  assert.equal(result.variantPricePayload, 9500);
  assert.equal(result.syncAllVariantPrices, false);
});

test("resolveImportVariantPricing treats variant-scope attr columns as variant row data", () => {
  const result = resolveImportVariantPricing({
    present: {
      price: false,
      variantPrice: false,
      variantSku: false,
      variantImageUrl: false,
      variantAttributes: false,
    },
    productPrice: undefined,
    variantPrice: undefined,
    finalVariantAttributesLength: 0,
    hasVariantScopeAttrs: true,
  });

  assert.equal(result.applyVariantPatch, true);
  assert.equal(result.hasVariantRowData, true);
});

test("IMPORT_MODES exposes update_only slug", () => {
  assert.equal(IMPORT_MODES.updateOnly, "update_only");
  assert.equal(IMPORT_MODES.upsert, "upsert");
});

test("parseVariantSizeList splits comma-separated sizes and normalizes", () => {
  assert.deepEqual(parseVariantSizeList("200х60, 200х70, 200х80, 200х90"), [
    "200x60",
    "200x70",
    "200x80",
    "200x90",
  ]);
  assert.deepEqual(parseVariantSizeList("200x60"), ["200x60"]);
  assert.deepEqual(parseVariantSizeList(""), []);
});

test("buildVariantAttributeSetsFromRow expands multiple sizes into variant sets", () => {
  const result = buildVariantAttributeSetsFromRow(
    {
      sku: "DOOR-01",
      "variant_attr:size": "200x60, 200x70, 200x80",
      "variant_attr:opening": "Левое",
    },
    attributeByCode,
    attributeByName,
    attributeOptionLookup,
  );

  assert.equal(result.expanded, true);
  assert.equal(result.sets.length, 3);
  assert.equal(result.sets[0].find((item) => item.attributeId === 10)?.valueText, "200x60");
  assert.equal(result.sets[1].find((item) => item.attributeId === 10)?.valueText, "200x70");
  assert.equal(result.sets[2].find((item) => item.attributeId === 10)?.valueText, "200x80");
  assert.equal(
    result.sets.every((set) => set.find((item) => item.attributeId === 11)?.valueText === "Левое"),
    true,
  );
});

test("buildVariantAttributeSetsFromRow keeps single size as one set", () => {
  const result = buildVariantAttributeSetsFromRow(
    { sku: "DOOR-01", "variant_attr:size": "200x60" },
    attributeByCode,
    attributeByName,
    attributeOptionLookup,
  );

  assert.equal(result.expanded, false);
  assert.equal(result.sets.length, 1);
  assert.equal(result.sets[0].length, 1);
  assert.equal(result.sets[0][0].valueText, "200x60");
});
