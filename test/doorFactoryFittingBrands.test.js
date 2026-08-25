const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  uniqueSortedNames,
  buildAdminRows,
  normalizeSaveItems,
} = require("../src/lib/server/domain/doorFactoryFittingBrands");

test("uniqueSortedNames de-duplicates by case and sorts in Russian", () => {
  assert.deepEqual(uniqueSortedNames(["Morelli", "аэлита", "morelli", "Аэлита", ""]), [
    "аэлита",
    "Morelli",
  ]);
});

test("buildAdminRows maps fittings factory onto each door factory", () => {
  assert.deepEqual(
    buildAdminRows({
      doorManufacturers: ["Аэлита", "Профильдорс"],
      mappings: [
        { doorManufacturerName: "аэлита", fittingsManufacturerName: "Morelli" },
      ],
    }),
    [
      { doorManufacturerName: "Аэлита", fittingsManufacturerName: "Morelli" },
      { doorManufacturerName: "Профильдорс", fittingsManufacturerName: "" },
    ],
  );
});

test("normalizeSaveItems keeps only known factories and drops empty mappings", () => {
  assert.deepEqual(
    normalizeSaveItems({
      doorManufacturers: ["Аэлита", "Профильдорс"],
      fittingsManufacturers: ["Morelli", "Armadillo"],
      items: [
        { doorManufacturerName: "аэлита", fittingsManufacturerName: "morelli" },
        { doorManufacturerName: "Профильдорс", fittingsManufacturerName: "" },
        { doorManufacturerName: "Неизвестная", fittingsManufacturerName: "Morelli" },
        { doorManufacturerName: "Аэлита", fittingsManufacturerName: "Armadillo" },
      ],
    }),
    [{ doorManufacturerName: "Аэлита", fittingsManufacturerName: "Morelli" }],
  );
});
