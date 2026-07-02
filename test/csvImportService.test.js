const test = require("node:test");
const assert = require("node:assert/strict");
const {
  validateCsvRows,
  requiredColumns,
  IMPORT_MODES,
  resolveUpdateOnlyRowDecision,
  resolveImportVariantPricing,
} = require("../src/lib/server/services/csvImportService");

test("required columns contain csv contract fields", () => {
  assert.deepEqual(requiredColumns, ["sku"]);
});

test("validateCsvRows returns errors for missing sku", () => {
  const errors = validateCsvRows([{ name: "Door", price: "10000" }]);

  assert.equal(errors.length, 1);
  assert.match(errors[0], /sku/i);
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

test("IMPORT_MODES exposes update_only slug", () => {
  assert.equal(IMPORT_MODES.updateOnly, "update_only");
  assert.equal(IMPORT_MODES.upsert, "upsert");
});
