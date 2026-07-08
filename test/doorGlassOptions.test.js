const { test } = require("node:test");
const assert = require("node:assert/strict");
const { parseCsv, parseActiveFlag, GLASS_CSV_COLUMNS } = require("../src/lib/server/domain/doorGlassCsv");
const { collectProductSkus } = require("../src/lib/server/domain/doorGlassOptions");
const {
  validateHardwarePayload,
  createAdminDoorHardwareService,
} = require("../src/lib/server/services/doorHardwareAdminService");
const {
  importDoorGlassOptionsFromRows,
} = require("../src/lib/server/services/doorGlassAdminService");

test("GLASS_CSV_COLUMNS includes parent_sku", () => {
  assert.ok(GLASS_CSV_COLUMNS.includes("parent_sku"));
  assert.ok(GLASS_CSV_COLUMNS.includes("glass_name"));
});

test("parseCsv reads glass CSV headers", () => {
  const rows = parseCsv(
    "manufacturer;parent_sku;glass_name;price_delta;sort_order;is_active\nАэлита;SKU-1;Матовое;1500;10;1",
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].parent_sku, "SKU-1");
  assert.equal(rows[0].glass_name, "Матовое");
});

test("parseActiveFlag handles common values", () => {
  assert.equal(parseActiveFlag("1"), true);
  assert.equal(parseActiveFlag("0"), false);
  assert.equal(parseActiveFlag("да"), true);
  assert.equal(parseActiveFlag("нет"), false);
});

test("collectProductSkus includes parent and variant skus", () => {
  const skus = collectProductSkus({
    sku: "PARENT-1",
    variants: [{ sku: "VAR-1" }, { sku: "VAR-2" }, { sku: "VAR-1" }],
  });
  assert.deepEqual(skus, ["PARENT-1", "VAR-1", "VAR-2"]);
});

test("validateHardwarePayload requires manufacturer and code", () => {
  const missingManufacturer = validateHardwarePayload({ code: "x", name: "Услуга" });
  assert.equal(missingManufacturer.ok, false);

  const missingCode = validateHardwarePayload({ manufacturerName: "Аэлита", name: "Услуга" });
  assert.equal(missingCode.ok, false);

  const ok = validateHardwarePayload({
    manufacturerName: "Аэлита",
    code: "hidden-hinges",
    name: "Скрытые петли",
    price: 1200,
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.value.price, 1200);
});

test("createAdminDoorHardwareService validates payload", async () => {
  const result = await createAdminDoorHardwareService({ manufacturerName: "Аэлита" });
  assert.equal(result.ok, false);
});

test("importDoorGlassOptionsFromRows rejects empty rows", async () => {
  const result = await importDoorGlassOptionsFromRows([]);
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
});
