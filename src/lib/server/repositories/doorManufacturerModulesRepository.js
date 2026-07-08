const { query } = require("../db/postgres");
const { ensureDoorOptionModuleTables } = require("../db/schemaPatches");

const mapRow = (row) => ({
  manufacturerName: String(row.manufacturerName || ""),
  finishPickerEnabled: row.finishPickerEnabled !== false,
  hardwareServicesEnabled: row.hardwareServicesEnabled === true,
  glassOptionsEnabled: row.glassOptionsEnabled === true,
});

const getByManufacturer = async (manufacturerName) => {
  await ensureDoorOptionModuleTables();
  const manufacturer = String(manufacturerName || "").trim();
  if (!manufacturer) return null;

  const res = await query(
    `
    SELECT
      manufacturer_name AS "manufacturerName",
      finish_picker_enabled AS "finishPickerEnabled",
      hardware_services_enabled AS "hardwareServicesEnabled",
      glass_options_enabled AS "glassOptionsEnabled"
    FROM door_manufacturer_modules
    WHERE LOWER(TRIM(manufacturer_name)) = LOWER(TRIM($1))
    LIMIT 1
    `,
    [manufacturer],
  );

  return res.rows[0] ? mapRow(res.rows[0]) : null;
};

const listManufacturers = async () => {
  await ensureDoorOptionModuleTables();
  const res = await query(
    `
    SELECT
      manufacturer_name AS "manufacturerName",
      finish_picker_enabled AS "finishPickerEnabled",
      hardware_services_enabled AS "hardwareServicesEnabled",
      glass_options_enabled AS "glassOptionsEnabled"
    FROM door_manufacturer_modules
    ORDER BY manufacturer_name ASC
    `,
  );
  return res.rows.map(mapRow);
};

const upsertModules = async ({
  manufacturerName,
  finishPickerEnabled = true,
  hardwareServicesEnabled = false,
  glassOptionsEnabled = false,
}) => {
  await ensureDoorOptionModuleTables();
  const manufacturer = String(manufacturerName || "").trim();
  if (!manufacturer) return null;

  const res = await query(
    `
    INSERT INTO door_manufacturer_modules(
      manufacturer_name,
      finish_picker_enabled,
      hardware_services_enabled,
      glass_options_enabled
    )
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (manufacturer_name) DO UPDATE SET
      finish_picker_enabled = EXCLUDED.finish_picker_enabled,
      hardware_services_enabled = EXCLUDED.hardware_services_enabled,
      glass_options_enabled = EXCLUDED.glass_options_enabled,
      updated_at = NOW()
    RETURNING
      manufacturer_name AS "manufacturerName",
      finish_picker_enabled AS "finishPickerEnabled",
      hardware_services_enabled AS "hardwareServicesEnabled",
      glass_options_enabled AS "glassOptionsEnabled"
    `,
    [
      manufacturer,
      finishPickerEnabled !== false,
      hardwareServicesEnabled === true,
      glassOptionsEnabled === true,
    ],
  );

  return mapRow(res.rows[0]);
};

module.exports = {
  getByManufacturer,
  listManufacturers,
  upsertModules,
};
