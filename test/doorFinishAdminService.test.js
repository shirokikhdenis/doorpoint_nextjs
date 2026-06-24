const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  listAdminDoorFinishes,
  createAdminDoorFinish,
  normalizeImportRow,
  importDoorFinishesFromRows,
} = require("../src/lib/server/services/doorFinishAdminService");

test("createAdminDoorFinish validates manufacturer and name", async () => {
  const missingManufacturer = await createAdminDoorFinish({ name: "Белый" });
  assert.equal(missingManufacturer.ok, false);

  const missingName = await createAdminDoorFinish({ manufacturerName: "Аэлита" });
  assert.equal(missingName.ok, false);
});

test("listAdminDoorFinishes returns group metadata", async () => {
  const result = await listAdminDoorFinishes({ manufacturer: "Аэлита" });
  assert.equal(result.ok, true);
  assert.ok(Array.isArray(result.manufacturers));
  assert.ok(result.groupLabels.solid);
  assert.ok(Array.isArray(result.finishes));
});

test("normalizeImportRow maps snake_case CSV columns", () => {
  const result = normalizeImportRow(
    {
      manufacturer: "Аэлита",
      group_key: "wood",
      name: "Дуб",
      image_url: "/img.jpg",
      price_delta: "1 500",
      sort_order: "5",
    },
    { rowIndex: 0 },
  );
  assert.equal(result.error, undefined);
  assert.equal(result.value.manufacturerName, "Аэлита");
  assert.equal(result.value.groupKey, "wood");
  assert.equal(result.value.priceDelta, 1500);
  assert.equal(result.value.sortOrder, 5);
});

test("normalizeImportRow maps Russian group labels and header case", () => {
  const result = normalizeImportRow(
    {
      Manufacturer: "Аэлита",
      group_key: "Под мрамор",
      name: "Дюна графит",
      price_delta: "1200",
      sort_order: "40",
    },
    { rowIndex: 0 },
  );
  assert.equal(result.error, undefined);
  assert.equal(result.value.manufacturerName, "Аэлита");
  assert.equal(result.value.groupKey, "marble");
});

test("normalizeImportRow uses default manufacturer", () => {
  const result = normalizeImportRow({ name: "Белый", group_key: "solid" }, {
    defaultManufacturer: "Аэлита",
    rowIndex: 2,
  });
  assert.equal(result.value?.manufacturerName, "Аэлита");
});

test("importDoorFinishesFromRows rejects empty rows", async () => {
  const result = await importDoorFinishesFromRows([]);
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
});

test("importDoorFinishesFromRows reports row validation errors", async () => {
  const result = await importDoorFinishesFromRows([{ group_key: "solid" }]);
  assert.equal(result.imported, 0);
  assert.equal(result.total, 1);
  assert.ok(result.errors.some((message) => message.includes("manufacturer")));
});

test("deleteAdminDoorFinishesByManufacturer requires manufacturer", async () => {
  const {
    deleteAdminDoorFinishesByManufacturer,
  } = require("../src/lib/server/services/doorFinishAdminService");
  const result = await deleteAdminDoorFinishesByManufacturer({});
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
});
